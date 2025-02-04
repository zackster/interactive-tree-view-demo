const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');

const app = express();

// CORS middleware for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    next();
});

app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

const pool = new Pool();  // Will use environment variables automatically

// Define initial tree data as fallback
const initialTreeData = {
    id: '1738626455208',
    label: 'Root',
    children: [
        {
            id: '1738626455209',
            label: 'Node 1',
            children: [
                { id: '1738626455210', label: 'Leaf 1', children: [] },
                { id: '1738626455211', label: 'Leaf 2', children: [] }
            ]
        },
        {
            id: '1738626455212',
            label: 'Node 2',
            children: [
                { id: '1738626455213', label: 'Leaf 3', children: [] }
            ]
        }
    ]
};

// API Routes need to be before the catch-all route
// Get latest tree data
app.get('/api/tree', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT tree_data FROM tree_versions ORDER BY created_at DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            // Return default tree if no data exists
            return res.json(initialTreeData);
        }

        res.json(result.rows[0].tree_data);
    } catch (err) {
        console.error('Error fetching tree:', err);
        res.status(500).json({ error: 'Failed to fetch tree data' });
    }
});

// Save new tree version
app.post('/api/tree', async (req, res) => {
    try {
        const { tree_data } = req.body;

        const result = await pool.query(
            'INSERT INTO tree_versions (tree_data) VALUES ($1) RETURNING version_id',
            [tree_data]
        );

        // Broadcast the update to all other clients
        broadcastTreeUpdate(tree_data);

        res.json({
            version_id: result.rows[0].version_id,
            message: 'Tree saved successfully'
        });
    } catch (err) {
        console.error('Error saving tree:', err);
        res.status(500).json({ error: 'Failed to save tree data' });
    }
});

// Catch-all route - must be after API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// HTTP Server
app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

// Create WebSocket server on different port
const wss = new WebSocketServer({ port: WS_PORT });

// Track all connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    // Add new client to set
    clients.add(ws);
    console.log('New client connected');

    ws.on('close', () => {
        // Remove client when they disconnect
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

// Function to broadcast tree updates to all clients except sender
function broadcastTreeUpdate(treeData, excludeWs = null) {
    clients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify({
                    type: 'treeUpdate',
                    data: treeData
                }));
            } catch (err) {
                console.error('Error sending to client:', err);
                clients.delete(client);
            }
        }
    });
}