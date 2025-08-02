import jwt from "jsonwebtoken";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import Stripe from "stripe";

export default async ({ req, res, log, error }) => {
  let client = null;

  // Helper function to send JSON response with CORS headers
  const corsResponse = (data, status = 200) => {
    return res.json(data, status, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    });
  };

  try {
    log("ComputerX API function started");
    log(`Request method: ${req.method || "GET"}, path: ${req.path || "/"}`);

    const path = req.path || "/";
    const method = req.method || "GET";
    const body = req.body
      ? typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body
      : {};
    const headers = req.headers || {};

    // Handle preflight OPTIONS requests first
    if (method === "OPTIONS") {
      log("CORS preflight request handled");
      return res.text("", 200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      });
    }

    // Health check (no DB needed)
    if (path === "/health") {
      return corsResponse({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "ComputerX API",
        version: "2.0.0",
      });
    }

    // Root endpoint
    if (path === "/" && method === "GET") {
      return corsResponse({
        message: "Hello from Computerx Server!",
        status: "API is running",
        timestamp: new Date().toISOString(),
        endpoints: {
          health: "/health",
          parts: "/parts",
          users: "/user",
          reviews: "/reviews",
          orders: "/orders",
          payments: "/create-payment-intent",
        },
      });
    }

    // Initialize database connection for API endpoints
    const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.zhd2i.mongodb.net/?retryWrites=true&w=majority`;
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1,
    });

    await client.connect();
    const db = client.db("Computerx");

    // Collections
    const partsCollection = db.collection("parts");
    const userCollection = db.collection("user");
    const reviewsCollection = db.collection("reviews");
    const ordersCollection = db.collection("orders");
    const paymentCollection = db.collection("payments");

    log("Database connected successfully");

    // Helper functions
    const verifyToken = (authHeader) => {
      if (!authHeader) throw new Error("No authorization header");
      const token = authHeader.split(" ")[1];
      return jwt.verify(token, process.env.ACCESS_TOKEN);
    };

    const checkAdmin = async (email) => {
      const user = await userCollection.findOne({ email });
      return user?.role === "admin";
    };

    // ==================== PARTS ENDPOINTS ====================

    // GET /parts - Get all parts
    if (path === "/parts" && method === "GET") {
      const parts = await partsCollection.find({}).toArray();
      await client.close();
      return corsResponse(parts);
    }

    // GET /purchase/:id - Get part by ID
    if (path.match(/^\/purchase\/[a-f\d]{24}$/i) && method === "GET") {
      const id = path.split("/")[2];
      const part = await partsCollection.findOne({ _id: new ObjectId(id) });
      await client.close();
      return corsResponse(part);
    }

    // POST /parts - Add part (Admin only)
    if (path === "/parts" && method === "POST") {
      try {
        const decoded = verifyToken(headers.authorization);
        const isAdmin = await checkAdmin(decoded.email);

        if (!isAdmin) {
          await client.close();
          return corsResponse({ message: "Forbidden" }, 403);
        }

        const result = await partsCollection.insertOne(body);
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // DELETE /parts/:id - Delete part (Admin only)
    if (path.match(/^\/parts\/[a-f\d]{24}$/i) && method === "DELETE") {
      try {
        const decoded = verifyToken(headers.authorization);
        const isAdmin = await checkAdmin(decoded.email);

        if (!isAdmin) {
          await client.close();
          return corsResponse({ message: "Forbidden" }, 403);
        }

        const id = path.split("/")[2];
        const result = await partsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // PUT /parts/:id - Update part quantity
    if (path.match(/^\/parts\/[a-f\d]{24}$/i) && method === "PUT") {
      try {
        verifyToken(headers.authorization);
        const id = path.split("/")[2];
        const updateDoc = { $set: { quantity: body.quantity } };
        const result = await partsCollection.updateOne(
          { _id: new ObjectId(id) },
          updateDoc
        );
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // ==================== USER ENDPOINTS ====================

    // GET /user - Get all users (Auth required)
    if (path === "/user" && method === "GET") {
      try {
        verifyToken(headers.authorization);
        const users = await userCollection.find({}).toArray();
        await client.close();
        return corsResponse(users);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // GET /admin/:email - Check admin status
    if (path.match(/^\/admin\/[^\/]+$/) && method === "GET") {
      const email = decodeURIComponent(path.split("/")[2]);
      const user = await userCollection.findOne({ email });
      const isAdmin = user?.role === "admin";
      await client.close();
      return corsResponse({ admin: isAdmin });
    }

    // PUT /user/:email - Add/update user
    if (path.match(/^\/user\/[^\/]+$/) && method === "PUT") {
      const email = decodeURIComponent(path.split("/")[2]);
      const filter = { email };
      const options = { upsert: true };
      const updateDoc = { $set: body };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "6h",
      });

      await client.close();
      return corsResponse({ result, token });
    }

    // GET /user/:email - Get user by email (Auth required)
    if (path.match(/^\/user\/[^\/]+$/) && method === "GET") {
      try {
        const decoded = verifyToken(headers.authorization);
        const email = decodeURIComponent(path.split("/")[2]);

        if (email !== decoded.email) {
          await client.close();
          return corsResponse({ message: "Forbidden Access" }, 403);
        }

        const user = await userCollection.findOne({ email });
        await client.close();
        return corsResponse(user);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // PUT /user/admin/:email - Make user admin (Admin only)
    if (path.match(/^\/user\/admin\/[^\/]+$/) && method === "PUT") {
      try {
        const decoded = verifyToken(headers.authorization);
        const isAdmin = await checkAdmin(decoded.email);

        if (!isAdmin) {
          await client.close();
          return corsResponse({ message: "Forbidden" }, 403);
        }

        const email = decodeURIComponent(path.split("/")[3]);
        const updateDoc = { $set: { role: "admin" } };
        const result = await userCollection.updateOne({ email }, updateDoc);

        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // PUT /update/:id - Update user info
    if (path.match(/^\/update\/[a-f\d]{24}$/i) && method === "PUT") {
      const id = path.split("/")[2];
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = { $set: body };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      await client.close();
      return corsResponse(result);
    }

    // ==================== REVIEWS ENDPOINTS ====================

    // GET /reviews - Get all reviews
    if (path === "/reviews" && method === "GET") {
      const reviews = await reviewsCollection.find({}).toArray();
      await client.close();
      return corsResponse(reviews);
    }

    // POST /reviews - Add review (Auth required)
    if (path === "/reviews" && method === "POST") {
      try {
        verifyToken(headers.authorization);
        const result = await reviewsCollection.insertOne(body);
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // ==================== ORDERS ENDPOINTS ====================

    // GET /orders - Get all orders
    if (path === "/orders" && method === "GET") {
      const orders = await ordersCollection.find({}).toArray();
      await client.close();
      return corsResponse(orders);
    }

    // POST /orders - Create order (Auth required)
    if (path === "/orders" && method === "POST") {
      try {
        verifyToken(headers.authorization);
        const result = await ordersCollection.insertOne(body);
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // GET /orders/:email - Get orders by email (Auth required)
    if (path.match(/^\/orders\/[^\/]+$/) && method === "GET") {
      try {
        const decoded = verifyToken(headers.authorization);
        const email = decodeURIComponent(path.split("/")[2]);

        if (email !== decoded.email) {
          await client.close();
          return corsResponse({ message: "Forbidden Access" }, 403);
        }

        const orders = await ordersCollection.find({ email }).toArray();
        await client.close();
        return corsResponse(orders);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // GET /payment/order/:id - Get order by ID (Auth required)
    if (path.match(/^\/payment\/order\/[a-f\d]{24}$/i) && method === "GET") {
      try {
        verifyToken(headers.authorization);
        const id = path.split("/")[3];
        const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
        await client.close();
        return corsResponse(order);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // PATCH /orders/:id - Update order with payment
    if (path.match(/^\/orders\/[a-f\d]{24}$/i) && method === "PATCH") {
      try {
        verifyToken(headers.authorization);
        const id = path.split("/")[2];
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            status: "pending",
            transactionId: body.transactionId,
          },
        };

        await paymentCollection.insertOne(body);
        const updatedOrder = await ordersCollection.updateOne(
          filter,
          updatedDoc
        );
        await client.close();
        return corsResponse(updatedOrder);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // PATCH /shipped/:id - Mark order as shipped
    if (path.match(/^\/shipped\/[a-f\d]{24}$/i) && method === "PATCH") {
      try {
        verifyToken(headers.authorization);
        const id = path.split("/")[2];
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = { $set: { status: "shipped" } };

        const result = await ordersCollection.updateOne(filter, updatedDoc);
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // DELETE /orders/:id - Delete order
    if (path.match(/^\/orders\/[a-f\d]{24}$/i) && method === "DELETE") {
      try {
        verifyToken(headers.authorization);
        const id = path.split("/")[2];
        const result = await ordersCollection.deleteOne({
          _id: new ObjectId(id),
        });
        await client.close();
        return corsResponse(result);
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // ==================== PAYMENT ENDPOINTS ====================

    // POST /create-payment-intent - Create Stripe payment intent
    if (path === "/create-payment-intent" && method === "POST") {
      try {
        verifyToken(headers.authorization);

        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        const price = body.total_price;
        const amount = price * 100;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        await client.close();
        return corsResponse({ clientSecret: paymentIntent.client_secret });
      } catch (authErr) {
        await client.close();
        return corsResponse({ message: "Unauthorized Access" }, 401);
      }
    }

    // Default response for unknown endpoints
    await client.close();
    return corsResponse(
      {
        success: false,
        message: `Endpoint ${method} ${path} not found`,
        availableEndpoints: [
          "/",
          "/health",
          "/parts",
          "/user",
          "/reviews",
          "/orders",
          "/create-payment-intent",
          "/purchase/:id",
          "/admin/:email",
        ],
      },
      404
    );
  } catch (err) {
    error(`Function error: ${err.message}`);
    error(`Stack trace: ${err.stack}`);

    if (client) {
      try {
        await client.close();
      } catch (closeErr) {
        error(`Error closing database: ${closeErr.message}`);
      }
    }

    return res.json(
      {
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong",
        timestamp: new Date().toISOString(),
      },
      500,
      {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      }
    );
  }
};
