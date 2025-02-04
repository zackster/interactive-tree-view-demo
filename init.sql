-- Create the tree_versions table
CREATE TABLE IF NOT EXISTS tree_versions (
    version_id SERIAL PRIMARY KEY,
    tree_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on created_at for faster retrieval of latest version
CREATE INDEX IF NOT EXISTS idx_tree_versions_created_at ON tree_versions(created_at DESC);

-- Insert initial tree data
INSERT INTO tree_versions (tree_data) 
VALUES (
    '{"id":"1738626455208","label":"Root","children":[{"id":"1738626455209","label":"Node 1","children":[{"id":"1738626455210","label":"Leaf 1","children":[]},{"id":"1738626455211","label":"Leaf 2","children":[]}]},{"id":"1738626455212","label":"Node 2","children":[{"id":"1738626455213","label":"Leaf 3","children":[]}]}]}'
)
    
ON CONFLICT DO NOTHING;