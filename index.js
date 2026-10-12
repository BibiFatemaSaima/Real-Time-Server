const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://poetic-frangipane-9c55c3.netlify.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

app.use(express.json());

// ================= MONGODB =================

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.za28cg0.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri);

let db;

async function connectToMongoDB() {
  if (!db) {
    await client.connect();

    console.log("Successfully connected to MongoDB!");

    db = client.db("Real-Time-Collaborative");
  }

  return db;
}

// ================= COLLECTIONS =================

const getCollections = async () => {
  const database = await connectToMongoDB();

  return {
    workspacesCollection: database.collection("workspaces"),
    boardsCollection: database.collection("boards"),
    listsCollection: database.collection("lists"),
    cardsCollection: database.collection("cards"),
    usersCollection: database.collection("users"),
    activitiesCollection: database.collection("activities"),
    commentsCollection: database.collection("comments"),
  };
};
// ================= WORKSPACE API =================

// Create a new workspace
app.post("/workspaces", async (req, res) => {
  try {
    const { workspacesCollection } = await getCollections();

    const { name, description, ownerEmail } = req.body;

    if (!name || !ownerEmail) {
      return res.status(400).send({
        message: "Workspace name and owner email are required",
      });
    }

    const workspace = {
      name,
      description: description || "",
      ownerEmail,
      members: [],
      createdAt: new Date(),
    };

    const result = await workspacesCollection.insertOne(workspace);

    res.status(201).send({
      message: "Workspace created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Workspace creation error:", error);

    res.status(500).send({
      message: "Failed to create workspace",
    });
  }
});
// Get all workspaces
app.get("/workspaces", async (req, res) => {
  try {
    const { workspacesCollection } = await getCollections();

    const workspaces = await workspacesCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(workspaces);
  } catch (error) {
    console.error("Failed to get workspaces:", error);

    res.status(500).send({
      message: "Failed to get workspaces",
    });
  }
});
// Add a member to workspace
app.post("/workspaces/:id/members", async (req, res) => {
  try {
    const { workspacesCollection } = await getCollections();

    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        message: "Member email is required",
      });
    }

    const result = await workspacesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          members: {
            email,
            role: "member",
            joinedAt: new Date(),
          },
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Workspace not found",
      });
    }

    res.send({
      message: "Member added successfully",
    });
  } catch (error) {
    console.error("Failed to add member:", error);

    res.status(500).send({
      message: "Failed to add member",
    });
  }
});
// Get single workspace
app.get("/workspaces/:id", async (req, res) => {
  try {
    const { workspacesCollection } = await getCollections();

    const { id } = req.params;

    const workspace = await workspacesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!workspace) {
      return res.status(404).send({
        message: "Workspace not found",
      });
    }

    res.send(workspace);
  } catch (error) {
    console.error("Failed to get workspace:", error);

    res.status(500).send({
      message: "Failed to get workspace",
    });
  }
});
// Create a new board
app.post("/boards", async (req, res) => {
  try {
    const { boardsCollection } = await getCollections();

    const { name, description, workspaceId, ownerEmail } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).send({
        message: "Board name and workspace ID are required",
      });
    }

    const board = {
      name,
      description: description || "",
      workspaceId,
      ownerEmail: ownerEmail || "",
      createdAt: new Date(),
    };

    const result = await boardsCollection.insertOne(board);

    res.status(201).send({
      message: "Board created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Board creation error:", error);

    res.status(500).send({
      message: "Failed to create board",
    });
  }
});
// get all boards
app.get("/boards/all", async (req, res) => {
  try {
    const { boardsCollection } = await getCollections();

    const boards = await boardsCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(boards);
  } catch (error) {
    console.error("Failed to get all boards:", error);

    res.status(500).send({
      message: "Failed to get all boards",
    });
  }
});
// Get single board
app.get("/boards/:id", async (req, res) => {
  try {
    const { boardsCollection } = await getCollections();

    const { id } = req.params;

    const board = await boardsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!board) {
      return res.status(404).send({
        message: "Board not found",
      });
    }

    res.send(board);
  } catch (error) {
    console.error("Failed to get board:", error);

    res.status(500).send({
      message: "Failed to get board",
    });
  }
});
// Update Board
app.put("/boards/:id", async (req, res) => {
  try {
    const { boardsCollection } = await getCollections();

    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Board name is required",
      });
    }

    const result = await boardsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description: description || "",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    res.send({
      message: "Board updated successfully",
    });
  } catch (error) {
    console.error("Update board error:", error);

    res.status(500).send({
      message: "Failed to update board",
      error: error.message,
    });
  }
});
// Delete Board
app.delete("/boards/:id", async (req, res) => {
  try {
    const { boardsCollection } = await getCollections();

    const { id } = req.params;

    const result = await boardsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Board not found",
      });
    }

    res.send({
      message: "Board deleted successfully",
    });
  } catch (error) {
    console.error("Delete board error:", error);

    res.status(500).send({
      message: "Failed to delete board",
      error: error.message,
    });
  }
});
// Get boards by workspace
app.get("/boards", async (req, res) => {
  try {
    const { boardsCollection } = await getCollections();

    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).send({
        message: "Workspace ID is required",
      });
    }

    const boards = await boardsCollection
      .find({ workspaceId })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(boards);
  } catch (error) {
    console.error("Failed to get boards:", error);

    res.status(500).send({
      message: "Failed to get boards",
    });
  }
});
// List post api
app.post("/lists", async (req, res) => {
  try {
    const { listsCollection, activitiesCollection } = await getCollections();

    const { name, boardId } = req.body;

    if (!name || !boardId) {
      return res.status(400).send({
        message: "Name and boardId are required",
      });
    }

    const newList = {
      name,
      boardId,
      createdAt: new Date(),
    };

    const result = await listsCollection.insertOne(newList);

    // Activity Log
    await activitiesCollection.insertOne({
      boardId,
      action: "created",
      entityType: "list",
      entityId: result.insertedId.toString(),
      message: `Created list "${name}"`,
      createdAt: new Date(),
    });

    res.send({
      message: "List created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create list error:", error);

    res.status(500).send({
      message: "Failed to create list",
      error: error.message,
    });
  }
});
// List get api
app.get("/lists", async (req, res) => {
  try {
    const { listsCollection } = await getCollections();

    const { boardId } = req.query;

    if (!boardId) {
      return res.status(400).send({
        message: "Board ID is required",
      });
    }

    const lists = await listsCollection
      .find({ boardId })
      .sort({ createdAt: 1 })
      .toArray();

    res.send(lists);
  } catch (error) {
    console.error("Failed to get lists:", error);

    res.status(500).send({
      message: "Failed to get lists",
    });
  }
});
// List update api
app.put("/lists/:id", async (req, res) => {
  try {
    const { listsCollection, activitiesCollection } = await getCollections();

    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).send({
        message: "List name is required",
      });
    }

    const { ObjectId } = require("mongodb");

    const list = await listsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!list) {
      return res.status(404).send({
        message: "List not found",
      });
    }

    const result = await listsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: name.trim(),
        },
      },
    );

    // Activity Log
    await activitiesCollection.insertOne({
      boardId: list.boardId,
      action: "updated",
      entityType: "list",
      entityId: id,
      message: `Updated list "${name.trim()}"`,
      createdAt: new Date(),
    });

    res.send({
      message: "List updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Update list error:", error);

    res.status(500).send({
      message: "Failed to update list",
      error: error.message,
    });
  }
});

// List delete api
app.delete("/lists/:id", async (req, res) => {
  try {
    const { listsCollection, activitiesCollection } = await getCollections();

    const { id } = req.params;

    const { ObjectId } = require("mongodb");

    const list = await listsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!list) {
      return res.status(404).send({
        message: "List not found",
      });
    }

    const result = await listsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Activity Log
    await activitiesCollection.insertOne({
      boardId: list.boardId,
      action: "deleted",
      entityType: "list",
      entityId: id,
      message: `Deleted list "${list.name}"`,
      createdAt: new Date(),
    });

    res.send({
      message: "List deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete list error:", error);

    res.status(500).send({
      message: "Failed to delete list",
      error: error.message,
    });
  }
});
// Card post api
app.post("/cards", async (req, res) => {
  try {
    const { cardsCollection, activitiesCollection } = await getCollections();

    const { title, description, listId, boardId, labels } = req.body;

    if (!title || !listId || !boardId) {
      return res.status(400).send({
        message: "Title, listId and boardId are required",
      });
    }

    const newCard = {
      title,
      description: description || "",
      listId,
      boardId,
      labels: labels || [],
      createdAt: new Date(),
    };

    const result = await cardsCollection.insertOne(newCard);

    // Activity Log
    await activitiesCollection.insertOne({
      boardId,
      action: "created",
      entityType: "card",
      entityId: result.insertedId.toString(),
      message: `Created card "${title}"`,
      createdAt: new Date(),
    });
    io.to(boardId).emit("card-created", {
      ...newCard,
      _id: result.insertedId,
    });
    res.send({
      message: "Card created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create card error:", error);

    res.status(500).send({
      message: "Failed to create card",
      error: error.message,
    });
  }
});

// Card get api
app.get("/cards", async (req, res) => {
  try {
    const { cardsCollection } = await getCollections();

    const { listId } = req.query;

    if (!listId) {
      return res.status(400).send({
        message: "List ID is required",
      });
    }

    const cards = await cardsCollection
      .find({ listId })
      .sort({ createdAt: 1 })
      .toArray();

    res.send(cards);
  } catch (error) {
    console.error("Failed to get cards:", error);

    res.status(500).send({
      message: "Failed to get cards",
    });
  }
});
// Move card to another list
// Update card
app.put("/cards/:id", async (req, res) => {
  try {
    const { cardsCollection, activitiesCollection } = await getCollections();

    const { id } = req.params;

    const { title, description, listId, dueDate, labels, assignee } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid card id",
      });
    }

    // Get old card data
    const oldCard = await cardsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!oldCard) {
      return res.status(404).send({
        message: "Card not found",
      });
    }

    const updateFields = {};

    // Title
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).send({
          message: "Card title is required",
        });
      }

      updateFields.title = title.trim();
    }

    // Description
    if (description !== undefined) {
      updateFields.description = description;
    }

    // List
    if (listId !== undefined) {
      updateFields.listId = listId;
    }

    // Due Date
    if (dueDate !== undefined) {
      updateFields.dueDate = dueDate;
    }

    // Labels
    if (labels !== undefined) {
      updateFields.labels = labels;
    }

    // Assignee
    if (assignee !== undefined) {
      updateFields.assignee = assignee;
    }

    // No field provided
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        message: "No fields to update",
      });
    }

    // Update card
    const result = await cardsCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateFields,
      },
    );

    // Activity Log
    let activityMessage = `Updated card "${oldCard.title}"`;

    // If card moved to another list
    if (listId !== undefined && listId !== oldCard.listId) {
      activityMessage = `Moved card "${oldCard.title}" to another list`;
    }

    // If title changed
    if (title !== undefined && title.trim() !== oldCard.title) {
      activityMessage = `Updated card title from "${oldCard.title}" to "${title.trim()}"`;
    }

    await activitiesCollection.insertOne({
      boardId: oldCard.boardId,
      action: "updated",
      entityType: "card",
      entityId: id,
      message: activityMessage,
      createdAt: new Date(),
    });

    res.send({
      message: "Card updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Update card error:", error);

    res.status(500).send({
      message: "Failed to update card",
      error: error.message,
    });
  }
});
// Delete card
app.delete("/cards/:id", async (req, res) => {
  try {
    const { cardsCollection, activitiesCollection } = await getCollections();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid card id",
      });
    }

    // Get card before deleting
    const card = await cardsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!card) {
      return res.status(404).send({
        message: "Card not found",
      });
    }

    // Delete card
    const result = await cardsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Activity Log
    await activitiesCollection.insertOne({
      boardId: card.boardId,
      action: "deleted",
      entityType: "card",
      entityId: id,
      message: `Deleted card "${card.title}"`,
      createdAt: new Date(),
    });

    res.send({
      message: "Card deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete card error:", error);

    res.status(500).send({
      message: "Failed to delete card",
      error: error.message,
    });
  }
});
// Get all cards API
app.get("/cards/all", async (req, res) => {
  try {
    const { cardsCollection } = await getCollections();

    const cards = await cardsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.send(cards);
  } catch (error) {
    console.error("Failed to get all cards:", error);

    res.status(500).send({
      message: "Failed to get all cards",
    });
  }
});
// ===============================
// Activity Log
// ===============================

app.get("/activities", async (req, res) => {
  try {
    const { activitiesCollection } = await getCollections();

    const { boardId } = req.query;

    if (!boardId) {
      return res.status(400).send({
        message: "boardId is required",
      });
    }

    const activities = await activitiesCollection
      .find({ boardId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.send(activities);
  } catch (error) {
    console.error("Get activities error:", error);

    res.status(500).send({
      message: "Failed to load activities",
      error: error.message,
    });
  }
});
// Create Comment
app.post("/comments", async (req, res) => {
  try {
    const { commentsCollection, activitiesCollection } = await getCollections();

    const { cardId, boardId, text } = req.body;

    if (!cardId || !boardId || !text) {
      return res.status(400).send({
        message: "cardId, boardId and text are required",
      });
    }

    const comment = {
      cardId,
      boardId,
      text,
      createdAt: new Date(),
    };

    const result = await commentsCollection.insertOne(comment);

    await activitiesCollection.insertOne({
      boardId,
      action: "created",
      entityType: "comment",
      entityId: result.insertedId.toString(),
      message: "Added a comment",
      createdAt: new Date(),
    });

    res.send({
      message: "Comment added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    res.status(500).send({
      message: "Failed to add comment",
      error: error.message,
    });
  }
});
// Get Comments
app.get("/comments", async (req, res) => {
  try {
    const { commentsCollection } = await getCollections();

    const { cardId } = req.query;

    if (!cardId) {
      return res.status(400).send({
        message: "Card ID is required",
      });
    }

    const comments = await commentsCollection
      .find({ cardId })
      .sort({ createdAt: 1 })
      .toArray();

    res.send(comments);
  } catch (error) {
    console.error("Get comments error:", error);

    res.status(500).send({
      message: "Failed to load comments",
      error: error.message,
    });
  }
});
// ================= HOME API =================

app.get("/", (req, res) => {
  res.send("Real-Time Collaborative Server is Running");
});

// ================= SERVER =================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-board", (boardId) => {
    socket.join(boardId);
    console.log(`User joined board: ${boardId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = server;
