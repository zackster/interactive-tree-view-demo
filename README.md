# Demo

![tree-demo](https://github.com/user-attachments/assets/b968ca79-aad9-4072-b8c6-3d3afb83a3a4)


# Features

* Front-end shows a tree view.
* The user can add, delete, and edit elements.
* Non-leaf elements are expandible/collapsible.
* The back-end is a RESTful web service.
* Data is stored in a relational database (PostgreSQL).
* The tree can easily support hundreds of thousands of elements.
* The tree view remembers its expanded/collapsed state in the current tab, even if the tab is reloaded.
* If the tree is modified by adding, removing, or editing nodes, other open tabs also update (without changing expanded/collapsed state). Uses websockets.
* Supports moving tree sub-branches within the tree.

## Development

1. `npm install`
2. `npm run dev` in one tab; `node server.js` in another

## Deployment

1. `docker compose up --build`
