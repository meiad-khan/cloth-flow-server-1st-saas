const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const { parseOrderText } = require("./services/orderParserService");

const app = express();

// ===============================
// Middlewares
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// Config
// ===============================
const PORT = process.env.PORT || 3000;
const uri = process.env.DB_URI;

// ===============================
// Root Route
// ===============================
app.get("/", (req, res) => {
  res.send("clothing server is running");
});

// ===============================
// Mongo Client
// ===============================
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const db = client.db("clothFlowDB");
    const orderCollection = db.collection("orders");
    const userCollection = db.collection("users");

    console.log("✅ MongoDB connected successfully");

    // =========================================================
    // Helper: request থেকে user email বের করার function
    // =========================================================
    // কেন লাগছে?
    // কারণ কিছু route এ email query থেকে আসবে,
    // কিছু route এ body থেকে আসবে
    const getEmailFromRequest = (req) => {
      return (
        req.query.email ||
        req.body.email ||
        req.body.sellerEmail ||
        req.headers["x-user-email"]
      );
    };

    // =========================================================
    // Middleware: user access check
    // =========================================================
    // এই middleware protected routes এর আগে run হবে
    // এবং check করবে user:
    // - আছে কি না
    // - blocked কি না
    // - pending কি না
    // - trial expired কি না
    const checkUserAccess = async (req, res, next) => {
      try {
        const email = getEmailFromRequest(req);

        if (!email) {
          return res.status(401).send({
            message: "User email missing",
          });
        }

        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        // blocked user ঢুকতে পারবে না
        if (user.accessStatus === "blocked") {
          return res.status(403).send({
            message: "Your account is blocked",
            accessStatus: "blocked",
          });
        }

        // pending user এখনো approved না
        if (user.accessStatus === "pending") {
          return res.status(403).send({
            message: "Your account is pending approval",
            accessStatus: "pending",
          });
        }

        // already expired হলে deny
        if (user.accessStatus === "expired") {
          return res.status(403).send({
            message: "Your trial has expired",
            accessStatus: "expired",
          });
        }

        // যদি trial user হয়, তাহলে trial date check করবে
        if (
          user.accessStatus === "trial" &&
          user.trialEndDate &&
          new Date(user.trialEndDate) < new Date()
        ) {
          // auto expired করে দিবে
          await userCollection.updateOne(
            { email },
            {
              $set: {
                accessStatus: "expired",
                updatedAt: new Date(),
              },
            },
          );

          return res.status(403).send({
            message: "Your trial has expired",
            accessStatus: "expired",
          });
        }

        // middleware pass হলে req তে user save করে দিচ্ছি
        req.dbUser = user;
        next();
      } catch (error) {
        res.status(500).send({
          message: "Access check failed",
          error: error.message,
        });
      }
    };

    // =========================================================
    // Middleware: admin check
    // =========================================================
    // এই middleware শুধু admin routes এ use হবে
    const checkAdmin = async (req, res, next) => {
      try {
        const email = getEmailFromRequest(req);

        if (!email) {
          return res.status(401).send({
            message: "Admin email missing",
          });
        }

        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({
            message: "Admin user not found",
          });
        }

        if (user.role !== "admin") {
          return res.status(403).send({
            message: "Admin access only",
          });
        }

        req.adminUser = user;
        next();
      } catch (error) {
        res.status(500).send({
          message: "Admin check failed",
          error: error.message,
        });
      }
    };

    // =========================================================
    // USERS ROUTES
    // =========================================================

    // ===============================
    // POST /api/users
    // User create / upsert
    // ===============================
    // কাজ:
    // - new user হলে save করবে
    // - existing user হলে update করবে
    // - default role = seller
    // - default accessStatus = pending
    app.post("/api/users", async (req, res) => {
      try {
        const { name, email, photoURL } = req.body;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const existingUser = await userCollection.findOne({ email });

        // যদি user আগে থেকেই থাকে
        if (existingUser) {
          await userCollection.updateOne(
            { email },
            {
              $set: {
                name: name || existingUser.name || "",
                photoURL: photoURL || existingUser.photoURL || "",
                updatedAt: new Date(),
              },
            },
          );

          const updatedUser = await userCollection.findOne({ email });
          return res.send(updatedUser);
        }

        // new user create
        const newUser = {
          name: name || "",
          email,
          photoURL: photoURL || "",
          role: "seller",
          accessStatus: "pending",
          trialStartDate: null,
          trialEndDate: null,
          isPaid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await userCollection.insertOne(newUser);
        const insertedUser = await userCollection.findOne({
          _id: result.insertedId,
        });

        res.send(insertedUser);
      } catch (error) {
        res.status(500).send({
          message: "Failed to save user",
          error: error.message,
        });
      }
    });

    // ===============================
    // GET /api/users/status
    // Specific user status check
    // ===============================
    app.get("/api/users/status", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        // trial date automatic expire check
        if (
          user.accessStatus === "trial" &&
          user.trialEndDate &&
          new Date(user.trialEndDate) < new Date()
        ) {
          await userCollection.updateOne(
            { email },
            {
              $set: {
                accessStatus: "expired",
                updatedAt: new Date(),
              },
            },
          );

          return res.send({
            email: user.email,
            name: user.name,
            role: user.role,
            accessStatus: "expired",
            isPaid: false,
            trialStartDate: user.trialStartDate || null,
            trialEndDate: user.trialEndDate || null,
          });
        }

        res.send({
          email: user.email,
          name: user.name,
          role: user.role,
          accessStatus: user.accessStatus,
          isPaid: user.isPaid || false,
          trialStartDate: user.trialStartDate || null,
          trialEndDate: user.trialEndDate || null,
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to get user status",
          error: error.message,
        });
      }
    });

    // =========================================================
    // ADMIN ROUTES
    // =========================================================

    // ===============================
    // GET /api/admin/users
    // All users list
    // ===============================
    app.get("/api/admin/users", checkAdmin, async (req, res) => {
      try {
        const users = await userCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.send(users);
      } catch (error) {
        res.status(500).send({
          message: "Failed to get users",
          error: error.message,
        });
      }
    });

    // ===============================
    // PATCH /api/admin/users/start-trial
    // Trial start
    // ===============================
    app.patch("/api/admin/users/start-trial", checkAdmin, async (req, res) => {
      try {
        const { userEmail, days } = req.body;

        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        const trialDays = Number(days) || 7;

        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + trialDays);

        const result = await userCollection.updateOne(
          { email: userEmail },
          {
            $set: {
              accessStatus: "trial",
              trialStartDate: now,
              trialEndDate: endDate,
              isPaid: false,
              updatedAt: new Date(),
            },
          },
        );

        res.send({
          message: `Trial started for ${trialDays} days`,
          result,
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to start trial",
          error: error.message,
        });
      }
    });

    // ===============================
    // PATCH /api/admin/users/activate-paid
    // Paid activate
    // ===============================
    app.patch(
      "/api/admin/users/activate-paid",
      checkAdmin,
      async (req, res) => {
        try {
          const { userEmail } = req.body;

          if (!userEmail) {
            return res.status(400).send({ message: "User email is required" });
          }

          const now = new Date();
          const endDate = new Date();
          endDate.setDate(now.getDate() + 30);

          const result = await userCollection.updateOne(
            { email: userEmail },
            {
              $set: {
                accessStatus: "active",
                isPaid: true,
                trialStartDate: now,
                trialEndDate: endDate,
                updatedAt: new Date(),
              },
            },
          );

          res.send({
            message: "User activated as paid user for 30 days",
            result,
          });
        } catch (error) {
          res.status(500).send({
            message: "Failed to activate paid user",
            error: error.message,
          });
        }
      },
    );

    // ===============================
    // PATCH /api/admin/users/block
    // Block user
    // ===============================
    app.patch("/api/admin/users/block", checkAdmin, async (req, res) => {
      try {
        const { userEmail } = req.body;

        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        const result = await userCollection.updateOne(
          { email: userEmail },
          {
            $set: {
              accessStatus: "blocked",
              updatedAt: new Date(),
            },
          },
        );

        res.send({
          message: "User blocked successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to block user",
          error: error.message,
        });
      }
    });

    // ===============================
    // PATCH /api/admin/users/unblock
    // Block remove
    // ===============================
    app.patch("/api/admin/users/unblock", checkAdmin, async (req, res) => {
      try {
        const { userEmail } = req.body;

        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        const result = await userCollection.updateOne(
          { email: userEmail },
          {
            $set: {
              accessStatus: "pending",
              updatedAt: new Date(),
            },
          },
        );

        res.send({
          message: "User unblocked successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to unblock user",
          error: error.message,
        });
      }
    });

    // ===============================
    // PATCH /api/admin/users/make-admin
    // Optional route: কাউকে admin বানানো
    // ===============================
    app.patch("/api/admin/users/make-admin", checkAdmin, async (req, res) => {
      try {
        const { userEmail } = req.body;

        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        const result = await userCollection.updateOne(
          { email: userEmail },
          {
            $set: {
              role: "admin",
              updatedAt: new Date(),
            },
          },
        );

        res.send({
          message: "User promoted to admin",
          result,
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to make admin",
          error: error.message,
        });
      }
    });

    // =========================================================
    // ORDER ROUTES
    // =========================================================

    // ===============================
    // POST /api/orders/parse
    // Order text parse
    // ===============================
    // কাজ:
    // - seller pasted raw message parse করবে
    // - structured data return করবে
    // - final order save করবে না
    app.post("/api/orders/parse", checkUserAccess, async (req, res) => {
      try {
        const { message } = req.body;

        if (!message || !message.trim()) {
          return res.status(400).send({
            success: false,
            message: "Message is required",
          });
        }

        const parsed = parseOrderText(message);

        res.send({
          success: true,
          data: parsed.data,
          missingFields: parsed.missingFields,
          warnings: parsed.warnings,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Failed to parse order text",
          error: error.message,
        });
      }
    });

    // ===============================
    // POST /api/orders
    // Create order
    // ===============================
    app.post("/api/orders", checkUserAccess, async (req, res) => {
      try {
        const order = req.body;

        if (order.sellerEmail !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized order creation",
          });
        }
        
        //ami add korechi confirmed at and delivered at dekhte..
        const now = new Date();

        order.status = order.status || "pending";
        order.source = order.source || "manual";
        order.createdAt = now;
        order.updatedAt = now;

        // status timestamp fields
        order.confirmedAt = order.status === "confirmed" ? now : null;
        order.deliveredAt = order.status === "delivered" ? now : null;

        // optional empty fields remove করে দিচ্ছি
        if (!order.address) delete order.address;
        if (!order.size) delete order.size;
        if (!order.color) delete order.color;

        const result = await orderCollection.insertOne(order);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to add order",
          error: error.message,
        });
      }
    });

    // ===============================
    // GET /api/orders
    // Email wise order list with pagination + filters
    // ===============================
    app.get("/api/orders", checkUserAccess, async (req, res) => {
      try {
        const {
          email,
          page = "1",
          limit = "15",
          search = "",
          status = "",
          dateFilter = "",
          startDate = "",
          endDate = "",
        } = req.query;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        if (email !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized access",
          });
        }

        const currentPage = Math.max(Number(page) || 1, 1);
        const pageSize = Math.max(Number(limit) || 15, 1);
        const skip = (currentPage - 1) * pageSize;

        const query = {
          sellerEmail: email,
        };

        if (status) {
          query.status = status;
        }

        if (search.trim()) {
          query.$or = [
            { customerName: { $regex: search.trim(), $options: "i" } },
            { phone: { $regex: search.trim(), $options: "i" } },
            { product: { $regex: search.trim(), $options: "i" } },
          ];
        }

        if (dateFilter === "today") {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          query.createdAt = {
            $gte: todayStart,
            $lte: todayEnd,
          };
        }

        if (["last2", "last3", "last7"].includes(dateFilter)) {
          const dayMap = {
            last2: 2,
            last3: 3,
            last7: 7,
          };

          const start = new Date();
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() - (dayMap[dateFilter] - 1));

          const end = new Date();
          end.setHours(23, 59, 59, 999);

          query.createdAt = {
            $gte: start,
            $lte: end,
          };
        }

        if (dateFilter === "custom") {
          const customDateQuery = {};

          if (startDate) {
            const customStart = new Date(startDate);
            customStart.setHours(0, 0, 0, 0);
            customDateQuery.$gte = customStart;
          }

          if (endDate) {
            const customEnd = new Date(endDate);
            customEnd.setHours(23, 59, 59, 999);
            customDateQuery.$lte = customEnd;
          }

          if (Object.keys(customDateQuery).length > 0) {
            query.createdAt = customDateQuery;
          }
        }

        const total = await orderCollection.countDocuments(query);

        const orders = await orderCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray();

        res.send({
          orders,
          total,
          page: currentPage,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        });
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch orders",
          error: error.message,
        });
      }
    });
    // ===============================
    // PATCH /api/orders/:id
    // Update order status
    // ===============================
    app.patch("/api/orders/:id", checkUserAccess, async (req, res) => {
      try {
        const id = req.params.id;
        const {
          email,
          status,
          customerName,
          phone,
          address,
          product,
          quantity,
          size,
          color,
          price,
        } = req.body;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        if (email !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized update",
          });
        }

        const existingOrder = await orderCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingOrder) {
          return res.status(404).send({
            message: "Order not found",
          });
        }

        if (existingOrder.sellerEmail !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized update",
          });
        }

        const now = new Date();

        const updateFields = {
          updatedAt: now,
        };

        if (customerName !== undefined)
          updateFields.customerName = customerName;
        if (phone !== undefined) updateFields.phone = phone;
        if (address !== undefined) updateFields.address = address;
        if (product !== undefined) updateFields.product = product;
        if (quantity !== undefined)
          updateFields.quantity = Number(quantity) || 1;
        if (size !== undefined) updateFields.size = size;
        if (color !== undefined) updateFields.color = color;
        if (price !== undefined) updateFields.price = Number(price) || 0;

        if (status !== undefined) {
          updateFields.status = status;

          if (status === "pending") {
            updateFields.confirmedAt = null;
            updateFields.deliveredAt = null;
          }

          if (status === "confirmed") {
            updateFields.confirmedAt = existingOrder.confirmedAt || now;
            updateFields.deliveredAt = null;
          }

          if (status === "delivered") {
            updateFields.confirmedAt = existingOrder.confirmedAt || now;
            updateFields.deliveredAt = now;
          }
        }

        if (!updateFields.address) delete updateFields.address;
        if (!updateFields.size) delete updateFields.size;
        if (!updateFields.color) delete updateFields.color;

        const result = await orderCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updateFields,
          },
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to update order",
          error: error.message,
        });
      }
    });

    // ===============================
    // DELETE /api/orders/:id
    // Delete order
    // ===============================
    app.delete("/api/orders/:id", checkUserAccess, async (req, res) => {
      try {
        const id = req.params.id;
        const { email } = req.body;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        if (email !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized delete",
          });
        }

        const existingOrder = await orderCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingOrder) {
          return res.status(404).send({
            message: "Order not found",
          });
        }

        if (existingOrder.sellerEmail !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized delete",
          });
        }

        const result = await orderCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete order" });
      }
    });

    // ===============================
    // GET /api/customers
    // Unique customers list
    // ===============================
    app.get("/api/customers", checkUserAccess, async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        if (email !== req.dbUser.email) {
          return res.status(403).send({
            message: "Unauthorized access",
          });
        }

        const orders = await orderCollection
          .find({ sellerEmail: email })
          .toArray();

        const grouped = {};

        for (const order of orders) {
          const phone = order.phone || "No Phone";

          if (!grouped[phone]) {
            grouped[phone] = {
              customerName: order.customerName || "Unknown",
              phone,
              totalOrders: 0,
              totalSpent: 0,
            };
          }

          grouped[phone].totalOrders += 1;

          if (order.status === "delivered") {
            grouped[phone].totalSpent += Number(order.price) || 0;
          }
        }

        res.send(Object.values(grouped));
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch customers",
          error: error.message,
        });
      }
    });

    // ===============================
    // GET /api/dashboard/summary
    // Seller dashboard summary (full data, no pagination issue)
    // ===============================
   app.get("/api/dashboard/summary", checkUserAccess, async (req, res) => {
     try {
       const { email } = req.query;

       if (!email) {
         return res.status(400).send({ message: "Email is required" });
       }

       if (email !== req.dbUser.email) {
         return res.status(403).send({
           message: "Unauthorized access",
         });
       }

       const orders = await orderCollection
         .find({ sellerEmail: email })
         .sort({ createdAt: -1 })
         .toArray();

       const totalOrders = orders.length;

       const pendingOrders = orders.filter(
         (order) => order.status === "pending",
       ).length;

       const confirmedOrders = orders.filter(
         (order) => order.status === "confirmed",
       ).length;

       const deliveredOrders = orders.filter(
         (order) => order.status === "delivered",
       ).length;

       const totalSell = orders
         .filter((order) => order.status === "delivered")
         .reduce((sum, order) => sum + (Number(order.price) || 0), 0);

       const uniqueCustomers = new Set(
         orders.map((order) => order.phone).filter(Boolean),
       ).size;

       const avgSellValue =
         deliveredOrders > 0 ? Math.round(totalSell / deliveredOrders) : 0;

       const today = new Date();
       today.setHours(0, 0, 0, 0);

       const isToday = (value) => {
         if (!value) return false;

         const date = new Date(value);
         if (Number.isNaN(date.getTime())) return false;

         date.setHours(0, 0, 0, 0);
         return date.getTime() === today.getTime();
       };

       const todayPendingOrders = orders.filter((order) => {
         return order.status === "pending" && isToday(order.createdAt);
       }).length;

       const todayConfirmedOrders = orders.filter((order) => {
         return isToday(order.confirmedAt);
       }).length;

       const todayDeliveredOrders = orders.filter((order) => {
         return isToday(order.deliveredAt);
       }).length;

       const todayTotalSell = orders
         .filter((order) => isToday(order.deliveredAt))
         .reduce((sum, order) => sum + (Number(order.price) || 0), 0);

       const recentPendingOrders = orders
         .filter((order) => order.status === "pending")
         .slice(0, 5);

       const recentOrders = orders.slice(0, 15);

       res.send({
         totalOrders,
         pendingOrders,
         confirmedOrders,
         deliveredOrders,
         totalSell,
         uniqueCustomers,
         avgSellValue,
         todayPendingOrders,
         todayConfirmedOrders,
         todayDeliveredOrders,
         todayTotalSell,
         recentPendingOrders,
         recentOrders,
       });
     } catch (error) {
       res.status(500).send({
         message: "Failed to fetch dashboard summary",
         error: error.message,
       });
     }
   });

    console.log("✅ Server routes ready");
  } finally {
    // client.close() দেইনি
    // কারণ server running থাকা অবস্থায় DB connection alive রাখতে চাই
  }
}

run().catch(console.dir);

// ===============================
// Server Listen
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
