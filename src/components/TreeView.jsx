import React, { useState, useEffect, useRef } from 'react';


const findNodeById = (tree, id) => {
    if (tree.id === id) return tree;
    if (tree.children) {
        for (let child of tree.children) {
            const node = findNodeById(child, id);
            if (node) return node;
        }
    }
    return null;
};

const findParent = (tree, id) => {
    if (tree.children) {
        if (tree.children.some(child => child.id === id)) return tree;
        for (let child of tree.children) {
            const parent = findParent(child, id);
            if (parent) return parent;
        }
    }
    return null;
};

const isDescendant = (parent, childId) => {
    if (!parent || !parent.children) return false;
    return parent.children.some(child =>
        child.id === childId || isDescendant(child, childId)
    );
};

const TreeNode = ({ node, onUpdate, onDelete, onAdd, onMove, level = 0 }) => {
    // Load initial expanded state from localStorage, defaulting to true if not found
    const storedExpanded = localStorage.getItem(`node-${node.id}-expanded`);
    const [isExpanded, setIsExpanded] = useState(storedExpanded !== null ? storedExpanded === 'true' : true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedLabel, setEditedLabel] = useState(node.label);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [dropPosition, setDropPosition] = useState(null);

    const hasChildren = node.children && node.children.length > 0;

    const handleToggle = () => {
        const newExpandedState = !isExpanded;
        setIsExpanded(newExpandedState);
        // Save to localStorage
        localStorage.setItem(`node-${node.id}-expanded`, newExpandedState.toString());
    };


    const nodeStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        paddingLeft: `${level * 20}px`,
        backgroundColor: isDraggingOver ? '#e6f4ff' : 'transparent',
        cursor: 'grab',
        borderTop: dropPosition === 'before' ? '2px solid #1890ff' : 'none',
        borderBottom: dropPosition === 'after' ? '2px solid #1890ff' : 'none',
        outline: dropPosition === 'inside' ? '2px solid #1890ff' : 'none'
    };

    const buttonStyle = {
        padding: '4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
    };

    const actionButtonsStyle = {
        display: 'flex',
        gap: '4px',
        opacity: 0,
        transition: 'opacity 0.2s'
    };

    const handleDragStart = (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({
            nodeId: node.id,
            label: node.label
        }));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        if (y < height * 0.25) {
            setDropPosition('before');
        } else if (y > height * 0.75) {
            setDropPosition('after');
        } else {
            setDropPosition('inside');
        }

        setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        setDropPosition(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        setDropPosition(null);

        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.nodeId !== node.id) {
            onMove(data.nodeId, node.id, dropPosition);
        }
    };

    return (
        <div>
            <div
                style={nodeStyle}
                draggable={true}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMouseEnter={e => e.currentTarget.querySelector('[role="toolbar"]').style.opacity = 1}
                onMouseLeave={e => e.currentTarget.querySelector('[role="toolbar"]').style.opacity = 0}
            >
                {hasChildren ? (
                    <button style={buttonStyle} onClick={handleToggle}>
                        {isExpanded ? '▼' : '▶'}
                    </button>
                ) : (
                    <span style={{ width: '24px' }}></span>
                )}

                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={editedLabel}
                            onChange={(e) => setEditedLabel(e.target.value)}
                            style={{ padding: '4px', flexGrow: 1 }}
                            autoFocus
                        />
                        <button style={buttonStyle} onClick={() => {
                            onUpdate(node.id, editedLabel);
                            setIsEditing(false);
                        }}>✓</button>
                        <button style={buttonStyle} onClick={() => {
                            setEditedLabel(node.label);
                            setIsEditing(false);
                        }}>✕</button>
                    </>
                ) : (
                    <>
                        <span style={{ flexGrow: 1 }}>{node.label}</span>
                        <div role="toolbar" style={actionButtonsStyle}>
                            <button style={buttonStyle} onClick={() => setIsEditing(true)}>✎</button>
                            <button style={buttonStyle} onClick={() => {
                                onAdd(node.id, {
                                    id: new Date().getTime().toString(),
                                    label: 'New Node',
                                    children: []
                                });
                            }}>+</button>
                            <button style={buttonStyle} onClick={() => onDelete(node.id)}>🗑</button>
                        </div>
                    </>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onAdd={onAdd}
                            onMove={onMove}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


const TreeView = () => {
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ws, setWs] = useState(null);

    // Store expanded states in a ref to avoid triggering effects
    const expandedStates = useRef(new Map());

    // Save expanded state when nodes are toggled
    const saveExpandedState = (nodeId, isExpanded) => {
        expandedStates.current.set(nodeId, isExpanded);
    };

    // Get expanded state for a node
    const getExpandedState = (nodeId) => {
        return expandedStates.current.get(nodeId) ?? true; // Default to expanded
    };

    // Recursively save expanded states for all nodes
    const saveAllExpandedStates = (node) => {
        if (!node) return;
        // Only save if we have a previous state
        const currentState = expandedStates.current.get(node.id);
        if (currentState !== undefined) {
            expandedStates.current.set(node.id, currentState);
        }
        if (node.children) {
            node.children.forEach(child => saveAllExpandedStates(child));
        }
    };

    // Setup WebSocket connection
    useEffect(() => {
        const wsClient = new WebSocket(WS_URL);

        wsClient.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'treeUpdate') {
                // Update tree data while preserving expanded states
                setTreeData(prevTree => {
                    // If this is the first tree data, just use it as is
                    if (!prevTree) return message.data;

                    // Otherwise, save current expanded states before updating
                    saveAllExpandedStates(prevTree);
                    return message.data;
                });
            }
        };

        wsClient.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        setWs(wsClient);

        // Cleanup on unmount
        return () => {
            wsClient.close();
        };
    }, []);

    // Fetch initial tree data
    useEffect(() => {
        fetchTreeData();
    }, []);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

    const fetchTreeData = async () => {
        try {
            const response = await fetch(`${API_URL}/api/tree`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });
            if (!response.ok) throw new Error('Failed to fetch tree data');
            const data = await response.json();
            setTreeData(data);
            setLoading(false);
        } catch (err) {
            console.error('Error loading tree:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const saveTreeData = async (newTreeData) => {
        try {
            const response = await fetch(`${API_URL}/api/tree`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({ tree_data: newTreeData }),
            });

            if (!response.ok) throw new Error('Failed to save tree data');

            const result = await response.json();
            console.log('Tree saved successfully:', result);
        } catch (err) {
            console.error('Error saving tree:', err);
            // Optionally show error to user
        }
    };

    // Wrap setTreeData to persist changes
    const updateTreeData = (newTreeData) => {
        setTreeData(newTreeData);
        saveTreeData(newTreeData);
    };

    const updateNode = (id, newLabel) => {
        const updateNodeRecursive = (node) => {
            if (node.id === id) {
                return { ...node, label: newLabel };
            }
            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(updateNodeRecursive)
                };
            }
            return node;
        };
        const newTree = updateNodeRecursive(treeData);
        updateTreeData(newTree);
    };

    const deleteNode = (id) => {
        const deleteNodeRecursive = (node) => {
            if (node.children) {
                return {
                    ...node,
                    children: node.children
                        .filter(child => child.id !== id)
                        .map(deleteNodeRecursive)
                };
            }
            return node;
        };
        const newTree = deleteNodeRecursive(treeData);
        updateTreeData(newTree);
    };

    const addNode = (parentId, newNode) => {
        const addNodeRecursive = (node) => {
            if (node.id === parentId) {
                return {
                    ...node,
                    children: [...(node.children || []), newNode]
                };
            }
            if (node.children) {
                return {
                    ...node,
                    children: node.children.map(addNodeRecursive)
                };
            }
            return node;
        };
        const newTree = addNodeRecursive(treeData);
        updateTreeData(newTree);
    };

    const moveNode = (sourceId, targetId, position) => {
        const newTree = { ...treeData };
        const sourceNode = findNodeById(newTree, sourceId);

        if (position === 'inside' && isDescendant(sourceNode, targetId)) {
            return;
        }

        const sourceParent = findParent(newTree, sourceId);
        const targetNode = findNodeById(newTree, targetId);
        const targetParent = findParent(newTree, targetId);

        if (!sourceNode || !targetNode) return;

        if (sourceParent) {
            sourceParent.children = sourceParent.children.filter(
                child => child.id !== sourceId
            );
        }

        const nodeToMove = { ...sourceNode };

        if (position === 'inside') {
            if (!targetNode.children) targetNode.children = [];
            targetNode.children.push(nodeToMove);
        } else {
            const targetParentChildren = (targetParent || newTree).children;
            const targetIndex = targetParentChildren.findIndex(
                child => child.id === targetId
            );
            const newIndex = position === 'before' ? targetIndex : targetIndex + 1;
            targetParentChildren.splice(newIndex, 0, nodeToMove);
        }

        updateTreeData(newTree);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>Interactive Tree View</h2>
            <p style={{ marginBottom: '16px', color: '#666' }}>
                Drag nodes to reorder or reorganize. Drag to the middle of a node to make it a child,
                or to the top/bottom edges to place it before/after.
            </p>
            {treeData && (
                <TreeNode
                    node={treeData}
                    onUpdate={updateNode}
                    onDelete={deleteNode}
                    onAdd={addNode}
                    onMove={moveNode}
                />
            )}
        </div>
    );
};

export default TreeView;