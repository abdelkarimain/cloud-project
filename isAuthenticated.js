const jwt = require("jsonwebtoken");

module.exports = function isAuthenticated(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader.split(" ")[1];
    if (!authHeader || !token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Error in isAuthenticated middleware:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
