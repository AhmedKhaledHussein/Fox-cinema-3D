# FOX CINEMA 3D — Recreated demo

A video-reference reconstruction of FOX CINEMA with an interactive WebGL cinema and demo ticket booking flow.

**Important:** This is a demonstration, not an official production cinema service. Payments and tickets are simulated; there is no real payment processing or persistent production booking inventory.

## Run locally
```bash
node server.js
```
Open http://localhost:4173/#/home

## Deploy on Vercel
The `vercel.json` configuration publishes `public/` as a **static interactive demo**. The Node.js demo API uses a local JSON file and is **not** deployed on Vercel. The static client uses in-browser demo booking.

## Origin
Recreated using a user's reference screen recording; source code and original 3D models were not recovered.
