# Features

* Front-end should show a tree view. Each element in the tree is represented by a unique ID and a user-editable string.
* The user can add, delete, and edit elements.
* Non-leaf elements are expandible/collapsible.
* The back-end is a RESTful web service.
* Data is stored in a relational database (PostgreSQL).
* Store the tree in a way that can easily support hundreds of thousands of elements.
* The tree view should remember its expanded/collapsed state in the current tab, even if the tab is reloaded.
* If the tree is modified by adding, removing, or editing nodes, other open tabs should also update (without changing expanded/collapsed state). Uses websockets.
* Supports moving tree sub-branches within the tree.

## Development

1. `npm install`
2. `npm run dev` in one tab; `node server.js` in another

## Deployment

1. `docker compose up --build`
