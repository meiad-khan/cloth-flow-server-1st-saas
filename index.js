const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("clothing server is running");
});

// 🔥 MongoDB URI (replace with your own)
const uri = process.env.DB_URI;

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const db = client.db("clothFlowDB");
    const orderCollection = db.collection("orders");
    const userCollection = db.collection("users");

    //post user
   app.post("/api/users", async (req, res) => {
     try {
       const user = req.body;

       const existingUser = await userCollection.findOne({ email: user.email });

       if (existingUser) {
         return res.send({ message: "User already exists", inserted: false });
       }

       user.createdAt = new Date();

       const result = await userCollection.insertOne(user);
       res.send({ inserted: true, result });
     } catch (error) {
       res.status(500).send({ message: "Failed to save user" });
     }
   });

    // ===============================
    // 🔥 POST: Create Order
    // ===============================
    app.post("/api/orders", async (req, res) => {
      const order = req.body;

      order.status = "pending";
      order.createdAt = new Date();

      const result = await orderCollection.insertOne(order);

      res.send(result);
    });

    // ===============================
    // 🔥 GET: email wise Orders
    // ===============================
    app.get("/api/orders", async (req, res) => {
      try {
        const email = req.query.email;

        const query = {};

        if (email) {
          query.sellerEmail = email;
        }

        const orders = await orderCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(orders);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    // ===============================
    // 🔥 PATCH: Update Status
    // ===============================
    app.patch("/api/orders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status, email } = req.body;

        const query = {
          _id: new ObjectId(id),
          sellerEmail: email,
        };

        const updateDoc = {
          $set: { status },
        };

        const result = await orderCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update status" });
      }
    });

    //delete order
    app.delete("/api/orders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { email } = req.query;

        const query = {
          _id: new ObjectId(id),
          sellerEmail: email,
        };

        const result = await orderCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete order" });
      }
    });

    console.log("✅ Server running...");
  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
