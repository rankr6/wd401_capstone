/* eslint-disable no-const-assign */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const jwt = require("jsonwebtoken");
const connectEnsureLogin = require("connect-ensure-login")
const app = express();
var cookieParser = require("cookie-parser");
const { User, Blog, sharedBlog, Comment, SavedBlog } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const LocalStrategy = require("passport-local");
const corsOptions = {
  origin: ['http://localhost:5173', 'https://blogbyrushikesh.netlify.app'],
  credentials: true,
  exposedHeaders: ["Access-Control-Allow-Headers", "Access-Control-Allow-Methods"],
};

app.use(cors(corsOptions));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));


const saltRounds = 10;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname + "/public")));

app.use(passport.initialize());
// app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    function (email, password, done) {
      //this one is typically a DB call. Assume that the returned user object is pre-formatted and ready for storing in JWT
      return User.findOne({ where: { email } })
        .then(async (user) => {
          if (!user) {
            return done(null, undefined, {
              message: "No such user",
            });
          }
          const result = await bcrypt.compare(password, user.password);
          if (!result) {
            return done(null, false, {
              message: "Incorrect email or password.",
            });
          } else {
            return done(null, user, { message: "Logged In Successfully" });
          }
        })
        .catch((error) => {
          return done(error);
        });
    }
  )
);

const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "your_jwt_secret",
    },
    function (jwtPayload, cb) {
      //find the user in db if needed. This functionality may be omitted if you store everything you'll need in JWT payload.
      return User.findByPk(jwtPayload.id)
        .then((user) => {
          return cb(null, user);
        })
        .catch((err) => {
          return cb(err);
        });
    }
  )
);


// function validateUser(req, res, done, next) {
//   // validate user (user email, user pass )
//   User.findOne({ where: { email: req.body.email } })
//     .then(async (user) => {
//       const result = await bcrypt.compare(req.body.password, user.password);
//       if (result) {
//         res.cookie(`em`, user.email, {
//           maxAge: 500 * 60 * 60 * 1000,
//           secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS in production
//           httpOnly: true,
//           sameSite: "None",
//         });
//         res.cookie(`ps`, user.password, {
//           maxAge: 500 * 60 * 60 * 1000,
//           secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS in production
//           httpOnly: true,
//           sameSite: "None",
//         });
//         res.cookie(`fn`, user.firstName, {
//           maxAge: 500 * 60 * 60 * 1000,
//           secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS in production
//           httpOnly: true,
//           sameSite: "None",
//         });
//         next();
//       } else {
//         return done(null, false, { message: "Invalid password" });
//       }
//     })
//     .catch((error) => {
//       return next(error);
//     });
// }

app.get("/", async function (request, response) {
  const user = request.user;
  if (request.accepts("html")) {
    response.render("index", {
      user,
    });
  } else {
    response.json({});
  }
});

app.get("/signUp", (request, response) => {
  response.render("signup");
});

app.get("/login", (request, response) => {
  response.status(400).json({ error: "authentication is required" });
});

function generateToken(user) {
  let sanitizedUser = user.toJSON();
  delete sanitizedUser["password"];

  return jwt.sign(sanitizedUser, process.env.JWT_SECRET || "your_jwt_secret");
}

//create user api endpoint

app.post("/users", async (request, response) => {
  let isAdmin = false;
  if (request.body.isAdmin != true) {
    isAdmin = true;
  }

  if (!request.body.password) {
    return response.status(400).json({ error: "Password is required" });
  }

  const hashedpwd = await bcrypt.hash(request.body.password, saltRounds);

  try {
    // Check if the provided username is already taken
    const existingUser = await User.findOne({
      where: {
        username: request.body.username,
      },
    });

    if (existingUser) {
      return response.status(400).json({ error: "Username is not available" });
    }

    // If username is unique, create the user
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      mobileNumber: request.body.mobileNumber,
      password: hashedpwd,
      username: request.body.username,
    });
    request.login(user, { session: false }, (err) => {
      if (err) {
        console.log(err);
      }
      let sanatisedUser = user.toJSON();
      delete sanatisedUser["password"];
      const token = jwt.sign(
        sanatisedUser,
        process.env.JWT_SECRET || "your_jwt_secret"
      );
      console.log(token);
      return response.json({ user: sanatisedUser, token });
    });
  } catch (error) {
    console.log(error);
    response.status(500).json({ error: "Internal Server Error" });
  }
});

//user login api endpoint

app.post(
  "/session",
  (req, res, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.status(400).json({
          message: info
        });
      }
      req.login(user, { session: false }, (err) => {
        if (err) {
          res.send(err);
        } // generate a signed json web token with the contents of user object and return it in the response
        let sanatisedUser = user.toJSON();
        delete sanatisedUser["password"];
        const token = jwt.sign(sanatisedUser, process.env.JWT_SECRET || "your_jwt_secret");
        return res.json({ user: sanatisedUser, token });
      });
    })(req, res, next);
  }
);

//user signout api endpoint

app.get("/signout", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    request.flash("success", "You have successfully signed out.");
    response.redirect("/");
  });
});

//create blog api

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post(
  "/publisher/createBlog",
  passport.authenticate("jwt", { session: false }),
  upload.single("blogThumbnail"),
  async (req, res) => {
    try {
      console.log("Inside createBlog endpoint");
      console.log(req.user.id);
      console.log("------------------------------------");
      console.log(req.body);
      let thumbnailBuffer;

      if (req.file) {
        thumbnailBuffer = req.file.buffer;
      } else {
        console.log("No image uploaded.");
        thumbnailBuffer = Buffer.from("No image available!");
      }

      console.log("After image upload");

      // Access the file buffer
      const blogThumbnailBase64 = thumbnailBuffer.toString("base64");


      // Save the file to the database (assuming you have a model named Blog with a column blogThumbnail of type bytea)
      const createBlog = await Blog.create({
        blogTitle: req.body.blogTitle,
        blogThumbnail: blogThumbnailBase64, // Save the buffer directly to the database
        blogDescription: req.body.blogDescription,
        location: req.body.location,
        date: new Date().toISOString(),
        userID: req.user.id,
      });
      console.log("after blog created to database");
      // Create a simplified JSON object for the response
      const simplifiedBlog = {
        id: createBlog.id,
        blogTitle: createBlog.blogTitle,
        blogThumbnail: createBlog.blogThumbnail,
        blogDescription: createBlog.blogDescription,
        location: createBlog.location,
        date: createBlog.date,
      };
      console.log("returning json");
      console.log(simplifiedBlog);
      return res.json(simplifiedBlog);
    } catch (err) {
      console.error(err);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }
);


app.get("/blogs", async (req, res) => {
  try {
    // Retrieve all blogs from the database
    const allBlogs = await Blog.findAll();

    // Form a response object with the required data
    // const blogsWithImages = allBlogs.map((blog) => ({
    //   blogTitle: blog.blogTitle,
    //   blogDescription: blog.blogDescription,
    //   location: blog.location,
    //   date: blog.date,
    //   blogThumbnail: blog.blogThumbnail,
    //   likes: blog.likes,
    // }));
    //res.json(blogsWithImages);
    const blogsInJSON = allBlogs.map(blog => blog.toJSON());
    res.json(blogsInJSON)
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/blogs/:id", async (req, res) => {
  try {
    // Retrieve all blogs from the database
    const blogID = req.params.id;
    console.log(blogID);
    const perticularBlog = await Blog.findByPk(blogID);
    res.json(perticularBlog);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.patch("/publisher/blogs/:blogID/:userID", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {

    if (req.user.id.toString() !== req.params.userID.toString()) {
      return res.status(403).json({ error: "Access denied. Invalid user ID." });
    }
    const userID = req.user.id;
    const blogID = req.params.blogID;
    console.log(blogID + " user " + userID);
    const blog = await Blog.findByPk(blogID);
    if (blog && blog.userID == userID) {
      const updateBlog = await blog.update({
        blogTitle: req.body.blogTitle,
        blogDescription: req.body.blogDescription,
        location: req.body.location,
      });
      res.json(updateBlog);
    } else {
      res.status(404).json({ error: "Blog not found or unauthorized" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/publisher/blogs/:blogID/:userID", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {


    if (req.user.id.toString() !== req.params.userID.toString()) {
      return res.status(403).json({ error: "Access denied. Invalid user ID." });
    }

    const userID = req.user.id;
    const blogID = req.params.blogID;

    // Use the destroy method to delete the blog
    const deletedBlog = await Blog.destroy({
      where: { id: blogID, userID: userID },
    });

    if (deletedBlog === 0) {
      // The destroy method returns the number of rows affected, so if it's 0, the blog was not found
      return res.status(404).json({ error: "Blog not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post("/blog/like/:blogID", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userID = req.user.id;
      const blogID = req.params.blogID;
      console.log("userID: " + userID + "    " + "blogID: " + blogID);
      // Like the blog
      const blog = await Blog.likeBlog(blogID, userID);

      res.json({ success: true, likes: blog.likes });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

app.post("/blog/share/:blogID", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      // Generate a unique shareable link
      const blogID = req.params.blogID;
      const shareableLink = generateShareableLink(blogID);

      // Store the link in the PostgreSQL database using Sequelize
      const sharedLink = await sharedBlog.create({
        blogID: blogID,
        shareBlogLink: shareableLink,
      });

      res.json({ shareableLink });
    } catch (error) {
      console.error("Error generating shareable link:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

function generateUniqueID() {
  return Math.random().toString(36).substring(7);
}

function generateShareableLink(blogID) {
  // Modify this function based on your requirements
  // Example: Using a base URL and appending blog ID and a unique identifier
  const baseLink = `http://localhost:5173/blogs/`;
  return `${baseLink}${blogID}`;
}

app.get("/share/:blogID", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const blogID = req.params.blogID;
      const uniqueID = req.params.uniqueID;

      // Validate the uniqueID (you might have a mechanism to check its validity)
      const isValidUniqueID = validateUniqueID(blogID, uniqueID);

      if (!isValidUniqueID) {
        return res.status(403).json({ error: "Invalid uniqueID" });
      }

      // Retrieve the blog based on the blogID
      const blog = await Blog.findByPk(blogID);

      if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
      }

      // Here, you can render a page or send the blog data as JSON, depending on your needs
      res.json({ blog });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

async function validateUniqueID(blogID, uniqueID) {
  try {
    // Check if the combination of blogID and uniqueID exists in the sharedBlog table
    const sharedLink = await sharedBlog.findOne({
      where: {
        blogID: blogID,
        shareBlogLink: uniqueID,
      },
    });

    // If the combination is found, return true; otherwise, return false
    return !!sharedLink;
  } catch (error) {
    console.error("Error validating uniqueID:", error);
    return false;
  }
}

app.get("/blog/comments/:blogID", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const blogID = req.params.blogID;

      // Retrieve all comments for the specified blog ID
      const comments = await Comment.findAll({
        where: { blogID },
        attributes: ["id", "text", "createdAt"],
        include: [
          {
            model: User,
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });
      console.log(comments);
      res.json({ comments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

// Post a new comment on a specific blog
app.post("/blog/comments/:blogID", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {

      const blogID = req.params.blogID;
      const { text } = req.body;

      // Create a new comment
      const comments = await Comment.create({
        text,
        userID: req.user.id,
        blogID,
      });

      res.json({ comments: comments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

app.post("/user/saveblog/:blogID", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {

      const blogID = req.params.blogID;

      // Check if the blog is already saved by the user
      const existingSavedBlog = await SavedBlog.findOne({
        where: { userID: req.user.id, blogID },
      });

      if (existingSavedBlog) {
        return res.status(400).json({ error: "Blog already saved" });
      }

      // Save the blog to the user's session
      const savedBlog = await SavedBlog.create({
        userID: req.user.id,
        blogID,
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

// Retrieve saved blogs for the user
app.get("/user/savedblogs", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {

      // Retrieve all blogs saved by the user
      const savedBlogs = await SavedBlog.findAll({
        where: { userID: req.user.id },
        include: [
          {
            model: Blog,
            attributes: [
              "id",
              "blogTitle",
              "blogDescription",
              "location",
              "date",
            ],
          },
        ],
      });

      res.json({ savedBlogs });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

module.exports = app;
