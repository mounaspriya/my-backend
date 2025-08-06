
// const express = require("express")
// const cors = require("cors")
// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const { Pool } = require("pg")
// const multer = require("multer")
// const path = require("path")
// const fs = require("fs")
// const ACL = require("acl")
// require("dotenv").config()

// const app = express()
// const port = process.env.PORT || 5000

// // JWT Secret
// const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey123!@#"

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, "uploads")
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true })
// }

// // === Middleware ===
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   }),
// )
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads"))

// // === Multer File Upload Config ===
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
//     cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
//   },
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
//   fileFilter: (req, file, cb) => {
//     file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed!"), false)
//   },
// })

// // === PostgreSQL Connection ===
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "Workstream1",
//   password: "Ayansh@03",
//   port: 5432,
// })

// // === ACL Setup ===
// let acl
// const initializeACL = async () => {
//   try {
//     acl = new ACL(new ACL.memoryBackend())
//     await acl.allow([
//       {
//         roles: ["admin"],
//         allows: [
//           { resources: "users", permissions: ["create", "read", "update", "delete"] },
//           { resources: "workstream", permissions: ["create", "read", "update", "delete"] },
//           { resources: "dashboard", permissions: ["read", "admin-view"] },
//           { resources: "reports", permissions: ["create", "read", "update", "delete"] },
//           { resources: "settings", permissions: ["read", "update"] },
//         ],
//       },
//       {
//         roles: ["viewer"],
//         allows: [
//           { resources: "workstream", permissions: ["read"] },
//           { resources: "dashboard", permissions: ["read", "viewer-view"] },
//           { resources: "reports", permissions: ["read"] },
//           { resources: "profile", permissions: ["read", "update"] },
//         ],
//       },
//     ])
//     await acl.addRoleParents("admin", ["viewer"])
//     console.log("✅ ACL initialized successfully")
//   } catch (error) {
//     console.error("❌ ACL initialization error:", error)
//   }
// }

// initializeACL()

// // === Authentication Middleware ===
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"]
//   const token = authHeader && authHeader.split(" ")[1]
//   if (!token) {
//     return res.status(401).json({ message: "Access token required" })
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET)
//     const user = pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.userId])
//     if (user.rows.length === 0) {
//       return res.status(401).json({ message: "User not found" })
//     }
//     req.user = user.rows[0]
//     next()
//   } catch (error) {
//     console.error("Token verification error:", error)
//     return res.status(403).json({ message: "Invalid or expired token" })
//   }
// }

// // === ACL Authorization Middleware ===
// const checkPermission = (resource, permission) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       const hasPermission = await acl.isAllowed(userId, resource, permission)
//       if (!hasPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: { resource, permission },
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Helper function to check multiple permissions ===
// const checkAnyPermission = (permissions) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       let hasAnyPermission = false
//       for (const { resource, permission } of permissions) {
//         const allowed = await acl.isAllowed(userId, resource, permission)
//         if (allowed) {
//           hasAnyPermission = true
//           break
//         }
//       }
//       if (!hasAnyPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: permissions,
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL multiple permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Date handling functions ===
// const isValidDateString = (dateStr) => {
//   if (!dateStr || typeof dateStr !== "string") return false
//   const dateRegex = /^\d{4}-\d{2}-\d{2}$/
//   if (!dateRegex.test(dateStr)) return false
//   const [year, month, day] = dateStr.split("-").map(Number)
//   return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
// }

// const getFridayOfWeek = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     console.error("❌ Invalid date string:", dateStr)
//     return null
//   }
//   try {
//     const [year, month, day] = dateStr.split("-").map(Number)
//     let adjustedMonth = month
//     let adjustedYear = year
//     if (month < 3) {
//       adjustedMonth += 12
//       adjustedYear -= 1
//     }
//     const q = day
//     const m = adjustedMonth
//     const k = adjustedYear % 100
//     const j = Math.floor(adjustedYear / 100)
//     const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
//     const dayOfWeek = (h + 5) % 7
//     const daysToFriday = (4 - dayOfWeek + 7) % 7
//     let fridayDay = day + daysToFriday
//     let fridayMonth = month
//     let fridayYear = year
//     const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
//     if (fridayYear % 4 === 0 && (fridayYear % 100 !== 0 || fridayYear % 400 === 0)) {
//       daysInMonth[1] = 29
//     }
//     if (fridayDay > daysInMonth[fridayMonth - 1]) {
//       fridayDay = fridayDay - daysInMonth[fridayMonth - 1]
//       fridayMonth += 1
//       if (fridayMonth > 12) {
//         fridayMonth = 1
//         fridayYear += 1
//       }
//     }
//     const result = `${fridayYear}-${String(fridayMonth).padStart(2, "0")}-${String(fridayDay).padStart(2, "0")}`
//     return result
//   } catch (error) {
//     console.error("❌ Error calculating Friday:", error)
//     return null
//   }
// }

// const getMonthAndYear = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     return { month: null, year: null }
//   }
//   try {
//     const [year, month] = dateStr.split("-").map(Number)
//     const monthNames = [
//       "January",
//       "February",
//       "March",
//       "April",
//       "May",
//       "June",
//       "July",
//       "August",
//       "September",
//       "October",
//       "November",
//       "December",
//     ]
//     return {
//       month: monthNames[month - 1],
//       year: year,
//     }
//   } catch (error) {
//     console.error("❌ Error calculating month/year:", error)
//     return { month: null, year: null }
//   }
// }

// const ensureDateString = (dateValue) => {
//   if (!dateValue) return null
//   if (typeof dateValue === "string" && isValidDateString(dateValue)) {
//     return dateValue
//   }
//   if (dateValue instanceof Date) {
//     const year = dateValue.getFullYear()
//     const month = String(dateValue.getMonth() + 1).padStart(2, "0")
//     const day = String(dateValue.getDate()).padStart(2, "0")
//     return `${year}-${month}-${day}`
//   }
//   if (typeof dateValue === "string" && dateValue.includes("T")) {
//     const datePart = dateValue.split("T")[0]
//     if (isValidDateString(datePart)) {
//       return datePart
//     }
//   }
//   console.error("❌ Could not convert to date string:", dateValue)
//   return null
// }

// const safeJSONStringify = (data, fallback = "[]") => {
//   try {
//     if (data === null || data === undefined) {
//       return fallback
//     }
//     if (typeof data === "string") {
//       const parsed = JSON.parse(data)
//       return JSON.stringify(parsed)
//     }
//     return JSON.stringify(data)
//   } catch (error) {
//     console.error("❌ JSON stringify error:", error)
//     return fallback
//   }
// }

// // === ROUTES ===

// // User list
// app.get("/api/open/users", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({ success: true, users: result.rows })
//   } catch (err) {
//     console.error("Error fetching users:", err.message)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete user item
// app.post("/api/admin/delete-users", async (req, res) => {
//   const { ids } = req.body
//   if (!Array.isArray(ids) || ids.length === 0) {
//     return res.status(400).json({ message: "No user IDs provided" })
//   }
//   try {
//     const result = await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids])
//     res.status(200).json({ message: "Users deleted successfully", deleted: result.rowCount })
//   } catch (error) {
//     console.error("Delete error:", error)
//     res.status(500).json({ message: "Internal server error" })
//   }
// })

// // Workstream listing
// app.get("/api/open/workstream", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)

//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching open workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // For GET /api/open/workstream1
// app.get("/api/open/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data")

//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({ success: true, data: formattedData })
//   } catch (err) {
//     console.error("Error fetching workstream1 data:", err)
//     res.status(500).json({ success: false, message: "Internal Server Error" })
//   }
// })

// // Delete workstream data by ID
// app.delete("/api/open/workstream/:id", async (req, res) => {
//   const { id } = req.params
//   try {
//     await pool.query("DELETE FROM workspace_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream record:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream data active for fields
// app.get("/api/fields/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//     res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.get("/api/admin/field-config", async (req, res) => {
//   const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//   res.json({ success: true, data: result.rows })
// })

// app.put("/api/admin/field-config/:fieldName", async (req, res) => {
//   const { fieldName } = req.params
//   const { is_active } = req.body
//   try {
//     await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [is_active, fieldName])
//     res.json({ success: true })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === AUTHENTICATION ROUTES ===
// // Register Route
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     console.log("📝 Registration attempt for:", email, "Role:", role)
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       })
//     }
//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 6 characters long",
//       })
//     }
//     if (!["admin", "viewer"].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Role must be either 'admin' or 'viewer'",
//       })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email already exists",
//       })
//     }
//     const saltRounds = 10
//     const hashedPassword = await bcrypt.hash(password, saltRounds)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     const user = newUser.rows[0]
//     await acl.addUserRoles(user.id.toString(), role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Registration successful for:", email, "Role:", role)
//     res.json({
//       success: true,
//       message: "Registration successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         created_at: user.created_at,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Registration error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Login Route
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body
//     console.log("🔐 Login attempt for:", email)
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required",
//       })
//     }
//     const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
//     if (userResult.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     const user = userResult.rows[0]
//     const isValidPassword = await bcrypt.compare(password, user.password)
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     await acl.addUserRoles(user.id.toString(), user.role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Login successful for:", email, "Role:", user.role)
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Get user profile
// app.get("/api/auth/profile", authenticateToken, (req, res) => {
//   res.json({
//     success: true,
//     user: req.user,
//   })
// })

// // workstreams api

// app.post("/api/open/workstream-list", async (req, res) => {
//   const { name } = req.body;
//   if (!name) return res.status(400).json({ success: false, message: "Name is required" });

//   try {
//     const result = await pool.query("INSERT INTO workstreams (name) VALUES ($1) RETURNING *", [name]);
//     res.json({ success: true, data: result.rows[0] });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Failed to add workstream" });
//   }
// });


// app.get("/api/open/workstream-list", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id");
//     res.json({ success: true, data: result.rows });
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Error fetching workstreams" });
//   }
// });





// // Get user permissions
// app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id.toString()
//     const userRoles = await acl.userRoles(userId)
//     const permissions = {}
//     const resources = ["users", "workstream", "dashboard", "reports", "settings", "profile"]
//     const permissionTypes = ["create", "read", "update", "delete", "admin-view", "viewer-view"]
//     for (const resource of resources) {
//       permissions[resource] = {}
//       for (const permission of permissionTypes) {
//         permissions[resource][permission] = await acl.isAllowed(userId, resource, permission)
//       }
//     }
//     res.json({
//       success: true,
//       user: req.user,
//       roles: userRoles,
//       permissions: permissions,
//     })
//   } catch (error) {
//     console.error("Error fetching permissions:", error)
//     res.status(500).json({ success: false, message: "Error fetching permissions" })
//   }
// })

// // === PROTECTED ROUTES WITH ACL ===
// // Admin only - Get all users
// app.get("/api/admin/users", authenticateToken, checkPermission("users", "read"), async (req, res) => {
//   try {
//     const users = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({
//       success: true,
//       users: users.rows,
//     })
//   } catch (error) {
//     console.error("Error fetching users:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Create user
// app.post("/api/admin/users", authenticateToken, checkPermission("users", "create"), async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     if (!name || !email || !password) {
//       return res.status(400).json({ success: false, message: "Name, email, and password are required" })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ success: false, message: "User already exists" })
//     }
//     const hashedPassword = await bcrypt.hash(password, 10)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     await acl.addUserRoles(newUser.rows[0].id.toString(), role)
//     res.json({
//       success: true,
//       message: "User created successfully",
//       user: newUser.rows[0],
//     })
//   } catch (error) {
//     console.error("Error creating user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Delete user
// app.delete("/api/admin/users/:id", authenticateToken, checkPermission("users", "delete"), async (req, res) => {
//   try {
//     const userId = req.params.id
//     await acl.removeUserRoles(userId, await acl.userRoles(userId))
//     const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])
//     if (result.rows.length === 0) {
//       return res.status(404).json({ success: false, message: "User not found" })
//     }
//     res.json({
//       success: true,
//       message: "User deleted successfully",
//     })
//   } catch (error) {
//     console.error("Error deleting user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream routes with ACL protection
// app.get("/api/workstream", authenticateToken, checkPermission("workstream", "read"), async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data ORDER BY id DESC")

//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === MAIN WORKSTREAM SUBMISSION ROUTE ===
// app.post("/api/workstream", upload.array("images", 10), async (req, res) => {
//   try {
//     const {
//       // ===== NEW FIELDS (From Reviewer Form) =====
//       fullName, // Maps to owner_name
//       registrationType, // Registration Type dropdown
//       reviewStatus, // Completed/Not Completed
//       reviewReason, // Reason when Not Completed
//       reviewType, // New Review/Re-Review
//       registrationPlatform, // Registration platform text
//       conditionalFields, // A1, A2, A3... fields

//       // ===== EXISTING FIELDS =====
//       accessibility,
//       third_party_content,
//       conditional_response,
//       website_type,
//       registration_site,
//       comments,
//       website_operator,
//       owner_name, // Keep this for backward compatibility
//       review_date,
//       calculated_friday,
//       review_month,
//       review_year,
//       review_traffic,
//       website_source_id,
//       website_url,
//       aChecks,
//     } = req.body

//     console.log("📝 Form submission received:")
//     console.log("New fields:", {
//       fullName,
//       registrationType,
//       reviewStatus,
//       reviewReason,
//       reviewType,
//       registrationPlatform,
//     })
//     console.log("🔧 Conditional fields received:", conditionalFields)
//     console.log("Existing fields:", { accessibility, third_party_content, website_url, owner_name })

//     // Handle website source ID
//     let finalWebsiteSourceId = website_source_id
//     if (!website_source_id && website_url) {
//       try {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       } catch (urlError) {
//         console.error("❌ Error handling website URL:", urlError)
//         throw new Error(`Website URL error: ${urlError.message}`)
//       }
//     }

//     const finalReviewDate = ensureDateString(review_date)
//     const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//     const { month, year } = getMonthAndYear(finalReviewDate)
//     const finalReviewMonth = review_month || month
//     const finalReviewYear = review_year || year

//     // Process images
//     let imageData = []
//     if (req.files && req.files.length > 0) {
//       imageData = req.files.map((file) => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         size: file.size,
//         mimetype: file.mimetype,
//         url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//       }))
//     }

//     // Parse aChecks
//     let parsedAChecks = []
//     if (aChecks) {
//       try {
//         parsedAChecks = typeof aChecks === "string" ? JSON.parse(aChecks) : aChecks
//       } catch (parseError) {
//         console.error("❌ Error parsing aChecks:", parseError)
//         parsedAChecks = []
//       }
//     }

//     // Parse conditional fields - FIXED
//     let parsedConditionalFields = {}
//     if (conditionalFields) {
//       try {
//         parsedConditionalFields =
//           typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//         console.log("✅ Parsed conditional fields:", parsedConditionalFields)
//       } catch (parseError) {
//         console.error("❌ Error parsing conditionalFields:", parseError)
//         parsedConditionalFields = {}
//       }
//     }

//     const imagesJSON = safeJSONStringify(imageData, "[]")
//     const aChecksJSON = safeJSONStringify(parsedAChecks, "[]")
//     const conditionalFieldsJSON = safeJSONStringify(parsedConditionalFields, "{}")

//     console.log("💾 Final conditional fields JSON:", conditionalFieldsJSON)

//     // Use fullName if provided, otherwise use owner_name
//     const finalOwnerName = fullName || owner_name

//     const insertQuery = `
//       INSERT INTO workspace_data (
//         registration_type, review_status, review_reason, review_type,
//         registration_platform, conditional_fields,
//         accessibility, third_party_content, conditional_response, website_type,
//         registration_site, comments, website_operator, owner_name, 
//         review_date, calculated_friday, review_month, review_year,
//         review_traffic, images, a_checks, website_source_id
//       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19, $20, $21, $22)
//       RETURNING id, review_date, calculated_friday, conditional_fields
//     `

//     const insertValues = [
//       // New fields
//       registrationType || null,
//       reviewStatus || null,
//       reviewReason || null,
//       reviewType || null,
//       registrationPlatform || null,
//       conditionalFieldsJSON, // This will be cast to JSONB

//       // Existing fields
//       accessibility || null,
//       third_party_content || null,
//       conditional_response || null,
//       website_type || null,
//       registration_site || null,
//       comments || null,
//       website_operator || null,
//       finalOwnerName || null,
//       finalReviewDate,
//       finalCalculatedFriday,
//       finalReviewMonth,
//       finalReviewYear,
//       review_traffic || null,
//       imagesJSON,
//       aChecksJSON,
//       finalWebsiteSourceId || null,
//     ]

//     console.log("💾 Inserting data with conditional fields:", conditionalFieldsJSON)

//     const result = await pool.query(insertQuery, insertValues)

//     console.log("✅ Form submitted successfully with ID:", result.rows[0].id)
//     console.log("✅ Stored conditional fields:", result.rows[0].conditional_fields)

//     res.status(200).json({
//       message: "Reviewer form submitted successfully!",
//       id: result.rows[0].id,
//       images: imageData,
//       website_source_id: finalWebsiteSourceId,
//       stored_review_date: ensureDateString(result.rows[0].review_date),
//       stored_calculated_friday: ensureDateString(result.rows[0].calculated_friday),
//       calculated_friday: finalCalculatedFriday,
//       review_month: finalReviewMonth,
//       review_year: finalReviewYear,
//       conditional_fields: result.rows[0].conditional_fields,
//     })
//   } catch (error) {
//     console.error("💥 === FORM SUBMISSION ERROR ===")
//     console.error("Error:", error)
//     if (req.files) {
//       req.files.forEach((file) => {
//         fs.unlink(file.path, (err) => {
//           if (err) console.error("Error deleting file:", err)
//         })
//       })
//     }

//     res.status(500).json({
//       error: "Failed to submit workstream data",
//       message: error.message,
//     })
//   }
// })

// // Dashboard routes with different permissions
// app.get("/api/dashboard/admin", authenticateToken, checkPermission("dashboard", "admin-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Admin dashboard data",
//     data: {
//       totalUsers: 100,
//       totalWorkstreams: 50,
//       systemHealth: "Good",
//     },
//   })
// })

// app.get("/api/dashboard/viewer", authenticateToken, checkPermission("dashboard", "viewer-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Viewer dashboard data",
//     data: {
//       myWorkstreams: 5,
//       recentActivity: [],
//     },
//   })
// })

// // Route that requires multiple permissions
// app.get(
//   "/api/workstream/:id/sensitive",
//   authenticateToken,
//   checkAnyPermission([
//     { resource: "workstream", permission: "delete" },
//     { resource: "users", permission: "read" },
//   ]),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: "Sensitive workstream data",
//       data: { id: req.params.id },
//     })
//   },
// )

// // Test route
// app.get("/api/auth/test", (req, res) => {
//   res.json({
//     message: "🎉 ACL-powered auth system working!",
//     timestamp: new Date().toISOString(),
//   })
// })

// // === Auto-suggest URL APIs ===
// app.get("/api/website-sources", async (req, res) => {
//   const { search } = req.query
//   if (!search) return res.json([])
//   try {
//     const result = await pool.query("SELECT id, website_url FROM website_sources WHERE website_url ILIKE $1 LIMIT 10", [
//       `%${search}%`,
//     ])
//     res.json(result.rows)
//   } catch (error) {
//     console.error("❌ /api/website-sources error:", error.message)
//     res.status(500).json({ error: error.message })
//   }
// })

// // === Get All Workstream Entries ===
// app.get("/api/workspace_data", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       review_date: ensureDateString(row.review_date),
//       calculated_friday: ensureDateString(row.calculated_friday),
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json(formattedData)
//   } catch (err) {
//     console.error("❌ Error fetching all workspace data:", err)
//     res.status(500).json({ message: "Server Error", error: err.message })
//   }
// })

// // === Get Single Workstream Entry by ID ===
// app.get("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.id = $1
//     `,
//       [id],
//     )
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = result.rows[0]
//     const formattedRecord = {
//       ...record,
//       review_date: ensureDateString(record.review_date),
//       calculated_friday: ensureDateString(record.calculated_friday),
//       conditional_fields: record.conditional_fields
//         ? typeof record.conditional_fields === "string"
//           ? JSON.parse(record.conditional_fields)
//           : record.conditional_fields
//         : {},
//     }
//     res.json(formattedRecord)
//   } catch (err) {
//     console.error("❌ Error fetching workspace_data by ID:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Update Workstream Entry by ID ===
// app.put(
//   "/api/workspace_data/:id",
//   (req, res, next) => {
//     const contentType = req.get("Content-Type") || ""
//     if (contentType.includes("multipart/form-data")) {
//       upload.array("images", 10)(req, res, next)
//     } else {
//       next()
//     }
//   },
//   async (req, res) => {
//     const id = req.params.id
//     console.log("🔄 Updating record ID:", id)
//     try {
//       let formData
//       let newImageFiles = []
//       let existingImages = []
//       const contentType = req.get("Content-Type") || ""
//       if (contentType.includes("multipart/form-data")) {
//         formData = req.body
//         if (req.files && req.files.length > 0) {
//           newImageFiles = req.files.map((file) => ({
//             filename: file.filename,
//             originalname: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype,
//             url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//           }))
//         }
//         if (formData.existing_images) {
//           try {
//             existingImages = JSON.parse(formData.existing_images)
//           } catch (e) {
//             console.error("Error parsing existing images:", e)
//             existingImages = []
//           }
//         }
//       } else {
//         formData = req.body
//         if (formData.images) {
//           try {
//             existingImages = typeof formData.images === "string" ? JSON.parse(formData.images) : formData.images
//           } catch (e) {
//             console.error("Error parsing images:", e)
//             existingImages = []
//           }
//         }
//       }

//       const {
//         // New fields
//         fullName,
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         conditionalFields,

//         // Existing fields
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         owner_name,
//         review_date,
//         calculated_friday,
//         review_month,
//         review_year,
//         review_traffic,
//         website_source_id,
//         website_url,
//         aChecks,
//       } = formData

//       let finalWebsiteSourceId = website_source_id
//       if (website_url && (!website_source_id || website_source_id === "")) {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       }

//       const finalReviewDate = ensureDateString(review_date)
//       const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//       const { month, year } = getMonthAndYear(finalReviewDate)
//       const finalReviewMonth = review_month || month
//       const finalReviewYear = review_year || year

//       const allImages = [...existingImages, ...newImageFiles]
//       const imagesJSON = safeJSONStringify(allImages, "[]")

//       // Parse conditional fields - FIXED
//       let parsedConditionalFields = {}
//       if (conditionalFields) {
//         try {
//           parsedConditionalFields =
//             typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//           console.log("🔄 Update - Parsed conditional fields:", parsedConditionalFields)
//         } catch (e) {
//           console.error("Error parsing conditionalFields:", e)
//         }
//       }

//       const finalOwnerName = fullName || owner_name

//       const updateQuery = `
//       UPDATE workspace_data SET 
//         registration_type = $1, review_status = $2, review_reason = $3, review_type = $4,
//         registration_platform = $5, conditional_fields = $6::jsonb,
//         accessibility = $7, third_party_content = $8, conditional_response = $9, website_type = $10,
//         registration_site = $11, comments = $12, website_operator = $13, owner_name = $14,
//         review_date = $15::date, calculated_friday = $16::date, review_month = $17, review_year = $18,
//         review_traffic = $19, website_source_id = $20, a_checks = $21, images = $22
//       WHERE id = $23
//       RETURNING *
//     `

//       const updateValues = [
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         safeJSONStringify(parsedConditionalFields, "{}"), // Cast to JSONB
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         finalOwnerName,
//         finalReviewDate,
//         finalCalculatedFriday,
//         finalReviewMonth,
//         finalReviewYear,
//         review_traffic,
//         finalWebsiteSourceId,
//         aChecks || null,
//         imagesJSON,
//         id,
//       ]

//       const result = await pool.query(updateQuery, updateValues)

//       if (result.rows.length === 0) {
//         return res.status(404).json({ message: "Record not found" })
//       }

//       const updatedRecord = await pool.query(
//         `SELECT wd.*, ws.website_url FROM workspace_data wd
//        LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//        WHERE wd.id = $1`,
//         [id],
//       )

//       const formattedUpdatedRecord = {
//         ...updatedRecord.rows[0],
//         review_date: ensureDateString(updatedRecord.rows[0].review_date),
//         calculated_friday: ensureDateString(updatedRecord.rows[0].calculated_friday),
//         conditional_fields: updatedRecord.rows[0].conditional_fields
//           ? typeof updatedRecord.rows[0].conditional_fields === "string"
//             ? JSON.parse(updatedRecord.rows[0].conditional_fields)
//             : updatedRecord.rows[0].conditional_fields
//           : {},
//       }

//       console.log("✅ Update successful")
//       res.json({
//         message: "Record updated successfully",
//         data: formattedUpdatedRecord,
//       })
//     } catch (err) {
//       console.error("❌ Error updating workspace_data:", err)
//       if (req.files) {
//         req.files.forEach((file) => {
//           fs.unlink(file.path, (err) => {
//             if (err) console.error("Error deleting file:", err)
//           })
//         })
//       }
//       res.status(500).json({ message: "Server error", error: err.message })
//     }
//   },
// )

// // === Delete Workstream Entry by ID ===
// app.delete("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const existingRecord = await pool.query("SELECT images FROM workspace_data WHERE id = $1", [id])
//     if (existingRecord.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = existingRecord.rows[0]
//     if (record.images) {
//       try {
//         const images = typeof record.images === "string" ? JSON.parse(record.images) : record.images
//         if (Array.isArray(images)) {
//           images.forEach((image) => {
//             if (image.filename) {
//               const filePath = path.join(__dirname, "uploads", image.filename)
//               fs.unlink(filePath, (err) => {
//                 if (err) console.error("❌ Error deleting image file:", err)
//               })
//             }
//           })
//         }
//       } catch (parseError) {
//         console.error("❌ Error parsing images for cleanup:", parseError)
//       }
//     }
//     const deleteResult = await pool.query("DELETE FROM workspace_data WHERE id = $1 RETURNING id", [id])
//     if (deleteResult.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     res.json({ message: "Record deleted successfully", deletedId: id })
//   } catch (err) {
//     console.error("❌ Error deleting workspace_data:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Error handling ===
// app.use((error, req, res, next) => {
//   console.error("❌ Unhandled error:", error)
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//   })
// })

// // === 404 handler ===
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.method} ${req.originalUrl} not found`,
//   })
// })

// // Start server
// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`)
//   console.log(`🔐 Auth test: http://localhost:${port}/api/auth/test`)
//   console.log(`👤 User permissions: http://localhost:${port}/api/auth/permissions`)
//   console.log("📋 ACL-Protected Routes:")
//   console.log("  GET  /api/admin/users - Admin only (users:read)")
//   console.log("  POST /api/admin/users - Admin only (users:create)")
//   console.log("  DELETE /api/admin/users/:id - Admin only (users:delete)")
//   console.log("  GET  /api/workstream - Read workstream (workstream:read)")
//   console.log("  POST /api/workstream - Create workstream (workstream:create)")
//   console.log("  GET  /api/dashboard/admin - Admin dashboard (dashboard:admin-view)")
//   console.log("  GET  /api/dashboard/viewer - Viewer dashboard (dashboard:viewer-view)")
// })




// const express = require("express")
// const cors = require("cors")
// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const { Pool } = require("pg")
// const multer = require("multer")
// const path = require("path")
// const fs = require("fs")
// const ACL = require("acl")
// require("dotenv").config()

// const app = express()
// const port = process.env.PORT || 5000

// // JWT Secret
// const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey123!@#"

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, "uploads")
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true })
// }

// // === Middleware ===
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   }),
// )
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads"))

// // === Multer File Upload Config ===
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
//     cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
//   },
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
//   fileFilter: (req, file, cb) => {
//     file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed!"), false)
//   },
// })

// // === PostgreSQL Connection ===
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "Workstream1",
//   password: "Ayansh@03",
//   port: 5432,
// })

// // === ACL Setup ===
// let acl
// const initializeACL = async () => {
//   try {
//     acl = new ACL(new ACL.memoryBackend())
//     await acl.allow([
//       {
//         roles: ["admin"],
//         allows: [
//           { resources: "users", permissions: ["create", "read", "update", "delete"] },
//           { resources: "workstream", permissions: ["create", "read", "update", "delete"] },
//           { resources: "dashboard", permissions: ["read", "admin-view"] },
//           { resources: "reports", permissions: ["create", "read", "update", "delete"] },
//           { resources: "settings", permissions: ["read", "update"] },
//         ],
//       },
//       {
//         roles: ["viewer"],
//         allows: [
//           { resources: "workstream", permissions: ["read"] },
//           { resources: "dashboard", permissions: ["read", "viewer-view"] },
//           { resources: "reports", permissions: ["read"] },
//           { resources: "profile", permissions: ["read", "update"] },
//         ],
//       },
//     ])
//     await acl.addRoleParents("admin", ["viewer"])
//     console.log("✅ ACL initialized successfully")
//   } catch (error) {
//     console.error("❌ ACL initialization error:", error)
//   }
// }
// initializeACL()

// // === Authentication Middleware ===
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"]
//   const token = authHeader && authHeader.split(" ")[1]
//   if (!token) {
//     return res.status(401).json({ message: "Access token required" })
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET)
//     const user = pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.userId])
//     if (user.rows.length === 0) {
//       return res.status(401).json({ message: "User not found" })
//     }
//     req.user = user.rows[0]
//     next()
//   } catch (error) {
//     console.error("Token verification error:", error)
//     return res.status(403).json({ message: "Invalid or expired token" })
//   }
// }

// // === ACL Authorization Middleware ===
// const checkPermission = (resource, permission) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       const hasPermission = await acl.isAllowed(userId, resource, permission)
//       if (!hasPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: { resource, permission },
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Helper function to check multiple permissions ===
// const checkAnyPermission = (permissions) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       let hasAnyPermission = false
//       for (const { resource, permission } of permissions) {
//         const allowed = await acl.isAllowed(userId, resource, permission)
//         if (allowed) {
//           hasAnyPermission = true
//           break
//         }
//       }
//       if (!hasAnyPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: permissions,
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL multiple permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Date handling functions ===
// const isValidDateString = (dateStr) => {
//   if (!dateStr || typeof dateStr !== "string") return false
//   const dateRegex = /^\d{4}-\d{2}-\d{2}$/
//   if (!dateRegex.test(dateStr)) return false
//   const [year, month, day] = dateStr.split("-").map(Number)
//   return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
// }

// const getFridayOfWeek = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     console.error("❌ Invalid date string:", dateStr)
//     return null
//   }
//   try {
//     const [year, month, day] = dateStr.split("-").map(Number)
//     let adjustedMonth = month
//     let adjustedYear = year
//     if (month < 3) {
//       adjustedMonth += 12
//       adjustedYear -= 1
//     }
//     const q = day
//     const m = adjustedMonth
//     const k = adjustedYear % 100
//     const j = Math.floor(adjustedYear / 100)
//     const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
//     const dayOfWeek = (h + 5) % 7
//     const daysToFriday = (4 - dayOfWeek + 7) % 7
//     let fridayDay = day + daysToFriday
//     let fridayMonth = month
//     let fridayYear = year
//     const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
//     if (fridayYear % 4 === 0 && (fridayYear % 100 !== 0 || fridayYear % 400 === 0)) {
//       daysInMonth[1] = 29
//     }
//     if (fridayDay > daysInMonth[fridayMonth - 1]) {
//       fridayDay = fridayDay - daysInMonth[fridayMonth - 1]
//       fridayMonth += 1
//       if (fridayMonth > 12) {
//         fridayMonth = 1
//         fridayYear += 1
//       }
//     }
//     const result = `${fridayYear}-${String(fridayMonth).padStart(2, "0")}-${String(fridayDay).padStart(2, "0")}`
//     return result
//   } catch (error) {
//     console.error("❌ Error calculating Friday:", error)
//     return null
//   }
// }

// const getMonthAndYear = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     return { month: null, year: null }
//   }
//   try {
//     const [year, month] = dateStr.split("-").map(Number)
//     const monthNames = [
//       "January",
//       "February",
//       "March",
//       "April",
//       "May",
//       "June",
//       "July",
//       "August",
//       "September",
//       "October",
//       "November",
//       "December",
//     ]
//     return {
//       month: monthNames[month - 1],
//       year: year,
//     }
//   } catch (error) {
//     console.error("❌ Error calculating month/year:", error)
//     return { month: null, year: null }
//   }
// }

// const ensureDateString = (dateValue) => {
//   if (!dateValue) return null
//   if (typeof dateValue === "string" && isValidDateString(dateValue)) {
//     return dateValue
//   }
//   if (dateValue instanceof Date) {
//     const year = dateValue.getFullYear()
//     const month = String(dateValue.getMonth() + 1).padStart(2, "0")
//     const day = String(dateValue.getDate()).padStart(2, "0")
//     return `${year}-${month}-${day}`
//   }
//   if (typeof dateValue === "string" && dateValue.includes("T")) {
//     const datePart = dateValue.split("T")[0]
//     if (isValidDateString(datePart)) {
//       return datePart
//     }
//   }
//   console.error("❌ Could not convert to date string:", dateValue)
//   return null
// }

// const safeJSONStringify = (data, fallback = "[]") => {
//   try {
//     if (data === null || data === undefined) {
//       return fallback
//     }
//     if (typeof data === "string") {
//       const parsed = JSON.parse(data)
//       return JSON.stringify(parsed)
//     }
//     return JSON.stringify(data)
//   } catch (error) {
//     console.error("❌ JSON stringify error:", error)
//     return fallback
//   }
// }

// // === ROUTES ===

// // User list
// app.get("/api/open/users", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({ success: true, users: result.rows })
//   } catch (err) {
//     console.error("Error fetching users:", err.message)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete user item
// app.post("/api/admin/delete-users", async (req, res) => {
//   const { ids } = req.body
//   if (!Array.isArray(ids) || ids.length === 0) {
//     return res.status(400).json({ message: "No user IDs provided" })
//   }
//   try {
//     const result = await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids])
//     res.status(200).json({ message: "Users deleted successfully", deleted: result.rowCount })
//   } catch (error) {
//     console.error("Delete error:", error)
//     res.status(500).json({ message: "Internal server error" })
//   }
// })

// // Workstream listing (Original workstream1 data)
// app.get("/api/open/workstream", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching open workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get specific workstream data by workstream ID (NEW ENDPOINT)
// app.get("/api/open/workstream/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // If it's workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query(`
//         SELECT 
//           wd.*,
//           ws.website_url
//         FROM workspace_data wd
//         LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//         ORDER BY wd.id DESC
//       `)

//       const formattedData = result.rows.map((row) => ({
//         ...row,
//         conditional_fields: row.conditional_fields
//           ? typeof row.conditional_fields === "string"
//             ? JSON.parse(row.conditional_fields)
//             : row.conditional_fields
//           : {},
//       }))

//       return res.json({
//         success: true,
//         data: formattedData,
//       })
//     }

//     // For dynamic workstreams, fetch data based on workstream_id
//     // You'll need to add a workstream_id column to workspace_data table or create separate tables
//     // For now, return empty data for new workstreams
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.workstream_id = $1
//       ORDER BY wd.id DESC
//     `,
//       [workstreamId],
//     )

//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // For GET /api/open/workstream1
// app.get("/api/open/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({ success: true, data: formattedData })
//   } catch (err) {
//     console.error("Error fetching workstream1 data:", err)
//     res.status(500).json({ success: false, message: "Internal Server Error" })
//   }
// })

// // Delete workstream data by ID
// app.delete("/api/open/workstream/:id", async (req, res) => {
//   const { id } = req.params
//   try {
//     await pool.query("DELETE FROM workspace_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream record:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream data active for fields
// app.get("/api/fields/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//     res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.get("/api/admin/field-config", async (req, res) => {
//   const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//   res.json({ success: true, data: result.rows })
// })

// app.put("/api/admin/field-config/:fieldName", async (req, res) => {
//   const { fieldName } = req.params
//   const { is_active } = req.body
//   try {
//     await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [is_active, fieldName])
//     res.json({ success: true })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === AUTHENTICATION ROUTES ===

// // Register Route
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     console.log("📝 Registration attempt for:", email, "Role:", role)
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       })
//     }
//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 6 characters long",
//       })
//     }
//     if (!["admin", "viewer"].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Role must be either 'admin' or 'viewer'",
//       })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email already exists",
//       })
//     }
//     const saltRounds = 10
//     const hashedPassword = await bcrypt.hash(password, saltRounds)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     const user = newUser.rows[0]
//     await acl.addUserRoles(user.id.toString(), role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Registration successful for:", email, "Role:", role)
//     res.json({
//       success: true,
//       message: "Registration successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         created_at: user.created_at,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Registration error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Login Route
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body
//     console.log("🔐 Login attempt for:", email)
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required",
//       })
//     }
//     const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
//     if (userResult.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     const user = userResult.rows[0]
//     const isValidPassword = await bcrypt.compare(password, user.password)
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     await acl.addUserRoles(user.id.toString(), user.role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Login successful for:", email, "Role:", user.role)
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Get user profile
// app.get("/api/auth/profile", authenticateToken, (req, res) => {
//   res.json({
//     success: true,
//     user: req.user,
//   })
// })

// // Workstreams API (Dynamic workstreams)
// app.post("/api/open/workstream-list", async (req, res) => {
//   const { name } = req.body
//   if (!name) return res.status(400).json({ success: false, message: "Name is required" })
//   try {
//     const result = await pool.query("INSERT INTO workstreams (name) VALUES ($1) RETURNING *", [name])
//     res.json({ success: true, data: result.rows[0] })
//   } catch (err) {
//     console.error("Error adding workstream:", err)
//     res.status(500).json({ success: false, message: "Failed to add workstream" })
//   }
// })

// app.get("/api/open/workstream-list", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get user permissions
// app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id.toString()
//     const userRoles = await acl.userRoles(userId)
//     const permissions = {}
//     const resources = ["users", "workstream", "dashboard", "reports", "settings", "profile"]
//     const permissionTypes = ["create", "read", "update", "delete", "admin-view", "viewer-view"]
//     for (const resource of resources) {
//       permissions[resource] = {}
//       for (const permission of permissionTypes) {
//         permissions[resource][permission] = await acl.isAllowed(userId, resource, permission)
//       }
//     }
//     res.json({
//       success: true,
//       user: req.user,
//       roles: userRoles,
//       permissions: permissions,
//     })
//   } catch (error) {
//     console.error("Error fetching permissions:", error)
//     res.status(500).json({ success: false, message: "Error fetching permissions" })
//   }
// })

// // === PROTECTED ROUTES WITH ACL ===

// // Admin only - Get all users
// app.get("/api/admin/users", authenticateToken, checkPermission("users", "read"), async (req, res) => {
//   try {
//     const users = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({
//       success: true,
//       users: users.rows,
//     })
//   } catch (error) {
//     console.error("Error fetching users:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Create user
// app.post("/api/admin/users", authenticateToken, checkPermission("users", "create"), async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     if (!name || !email || !password) {
//       return res.status(400).json({ success: false, message: "Name, email, and password are required" })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ success: false, message: "User already exists" })
//     }
//     const hashedPassword = await bcrypt.hash(password, 10)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     await acl.addUserRoles(newUser.rows[0].id.toString(), role)
//     res.json({
//       success: true,
//       message: "User created successfully",
//       user: newUser.rows[0],
//     })
//   } catch (error) {
//     console.error("Error creating user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Delete user
// app.delete("/api/admin/users/:id", authenticateToken, checkPermission("users", "delete"), async (req, res) => {
//   try {
//     const userId = req.params.id
//     await acl.removeUserRoles(userId, await acl.userRoles(userId))
//     const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])
//     if (result.rows.length === 0) {
//       return res.status(404).json({ success: false, message: "User not found" })
//     }
//     res.json({
//       success: true,
//       message: "User deleted successfully",
//     })
//   } catch (error) {
//     console.error("Error deleting user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream routes with ACL protection
// app.get("/api/workstream", authenticateToken, checkPermission("workstream", "read"), async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data ORDER BY id DESC")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === MAIN WORKSTREAM SUBMISSION ROUTE ===
// app.post("/api/workstream", upload.array("images", 10), async (req, res) => {
//   try {
//     const {
//       // ===== NEW FIELDS (From Reviewer Form) =====
//       fullName, // Maps to owner_name
//       registrationType, // Registration Type dropdown
//       reviewStatus, // Completed/Not Completed
//       reviewReason, // Reason when Not Completed
//       reviewType, // New Review/Re-Review
//       registrationPlatform, // Registration platform text
//       conditionalFields, // A1, A2, A3... fields
//       // ===== EXISTING FIELDS =====
//       accessibility,
//       third_party_content,
//       conditional_response,
//       website_type,
//       registration_site,
//       comments,
//       website_operator,
//       owner_name, // Keep this for backward compatibility
//       review_date,
//       calculated_friday,
//       review_month,
//       review_year,
//       review_traffic,
//       website_source_id,
//       website_url,
//       aChecks,
//     } = req.body

//     console.log("📝 Form submission received:")
//     console.log("New fields:", {
//       fullName,
//       registrationType,
//       reviewStatus,
//       reviewReason,
//       reviewType,
//       registrationPlatform,
//     })
//     console.log("🔧 Conditional fields received:", conditionalFields)
//     console.log("Existing fields:", { accessibility, third_party_content, website_url, owner_name })

//     // Handle website source ID
//     let finalWebsiteSourceId = website_source_id
//     if (!website_source_id && website_url) {
//       try {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       } catch (urlError) {
//         console.error("❌ Error handling website URL:", urlError)
//         throw new Error(`Website URL error: ${urlError.message}`)
//       }
//     }

//     const finalReviewDate = ensureDateString(review_date)
//     const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//     const { month, year } = getMonthAndYear(finalReviewDate)
//     const finalReviewMonth = review_month || month
//     const finalReviewYear = review_year || year

//     // Process images
//     let imageData = []
//     if (req.files && req.files.length > 0) {
//       imageData = req.files.map((file) => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         size: file.size,
//         mimetype: file.mimetype,
//         url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//       }))
//     }

//     // Parse aChecks
//     let parsedAChecks = []
//     if (aChecks) {
//       try {
//         parsedAChecks = typeof aChecks === "string" ? JSON.parse(aChecks) : aChecks
//       } catch (parseError) {
//         console.error("❌ Error parsing aChecks:", parseError)
//         parsedAChecks = []
//       }
//     }

//     // Parse conditional fields - FIXED
//     let parsedConditionalFields = {}
//     if (conditionalFields) {
//       try {
//         parsedConditionalFields =
//           typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//         console.log("✅ Parsed conditional fields:", parsedConditionalFields)
//       } catch (parseError) {
//         console.error("❌ Error parsing conditionalFields:", parseError)
//         parsedConditionalFields = {}
//       }
//     }

//     const imagesJSON = safeJSONStringify(imageData, "[]")
//     const aChecksJSON = safeJSONStringify(parsedAChecks, "[]")
//     const conditionalFieldsJSON = safeJSONStringify(parsedConditionalFields, "{}")

//     console.log("💾 Final conditional fields JSON:", conditionalFieldsJSON)

//     // Use fullName if provided, otherwise use owner_name
//     const finalOwnerName = fullName || owner_name

//     const insertQuery = `
//       INSERT INTO workspace_data (
//         registration_type, review_status, review_reason, review_type,
//         registration_platform, conditional_fields,
//         accessibility, third_party_content, conditional_response, website_type,
//         registration_site, comments, website_operator, owner_name, 
//         review_date, calculated_friday, review_month, review_year,
//         review_traffic, images, a_checks, website_source_id
//       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19, $20, $21, $22)
//       RETURNING id, review_date, calculated_friday, conditional_fields
//     `

//     const insertValues = [
//       // New fields
//       registrationType || null,
//       reviewStatus || null,
//       reviewReason || null,
//       reviewType || null,
//       registrationPlatform || null,
//       conditionalFieldsJSON, // This will be cast to JSONB
//       // Existing fields
//       accessibility || null,
//       third_party_content || null,
//       conditional_response || null,
//       website_type || null,
//       registration_site || null,
//       comments || null,
//       website_operator || null,
//       finalOwnerName || null,
//       finalReviewDate,
//       finalCalculatedFriday,
//       finalReviewMonth,
//       finalReviewYear,
//       review_traffic || null,
//       imagesJSON,
//       aChecksJSON,
//       finalWebsiteSourceId || null,
//     ]

//     console.log("💾 Inserting data with conditional fields:", conditionalFieldsJSON)

//     const result = await pool.query(insertQuery, insertValues)

//     console.log("✅ Form submitted successfully with ID:", result.rows[0].id)
//     console.log("✅ Stored conditional fields:", result.rows[0].conditional_fields)

//     res.status(200).json({
//       message: "Reviewer form submitted successfully!",
//       id: result.rows[0].id,
//       images: imageData,
//       website_source_id: finalWebsiteSourceId,
//       stored_review_date: ensureDateString(result.rows[0].review_date),
//       stored_calculated_friday: ensureDateString(result.rows[0].calculated_friday),
//       calculated_friday: finalCalculatedFriday,
//       review_month: finalReviewMonth,
//       review_year: finalReviewYear,
//       conditional_fields: result.rows[0].conditional_fields,
//     })
//   } catch (error) {
//     console.error("💥 === FORM SUBMISSION ERROR ===")
//     console.error("Error:", error)
//     if (req.files) {
//       req.files.forEach((file) => {
//         fs.unlink(file.path, (err) => {
//           if (err) console.error("Error deleting file:", err)
//         })
//       })
//     }
//     res.status(500).json({
//       error: "Failed to submit workstream data",
//       message: error.message,
//     })
//   }
// })

// // workstream2

// // Get all workstream2 data
// app.get("/api/workstream2", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT * FROM workstream2_data 
//       ORDER BY created_at DESC
//     `)
//     res.json({ success: true, data: result.rows })
//   } catch (error) {
//     console.error("Error fetching workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Add new workstream2 record
// app.post("/api/workstream2", async (req, res) => {
//   try {
//     const {
//       case_no,
//       test_successful,
//       card_no,
//       card_country,
//       expiry_date,
//       cvv,
//       email,
//       tested_url_homepage,
//       tested_url,
//       tested_on_date,
//       tested_amount,
//       tested_currency,
//       billing_address_if_asked,
//       billing_phone_number,
//       billing_name,
//       declined_message,
//       not_tested_breakup,
//       comments,
//       id_verification_required,
//       bypass_id_verification,
//       violation,
//       tested_product,
//       merchant_name_bill,
//       log_generated,
//       transaction_gmt_date,
//       account_number_masked,
//       acquiring_identifier,
//       acquiring_user_bid,
//       acquirer_name,
//       acquiring_identifier_region,
//       acquirer_region,
//       acquiring_identifier_legal_country,
//       acquirer_country,
//       merchant_name_acceptor,
//       merchant_city,
//       merchant_state_code,
//       merchant_state,
//       merchant_country_code,
//       merchant_country,
//       merchant_category_code,
//       enriched_merchant_category,
//       card_acceptor_id,
//       card_acceptor_terminal_id,
//       pos_entry_mode,
//       enriched_pos_entry_mode,
//       pos_condition_code,
//       pos_condition,
//       transaction_identifier,
//       transaction_currency_code,
//       eci_moto_group_code,
//       metrics,
//       auth_transaction_count,
//       transaction_amount_usd,
//       auth_transaction_amount,
//     } = req.body

//     const result = await pool.query(
//       `
//       INSERT INTO workstream2_data (
//         case_no, test_successful, card_no, card_country, expiry_date, cvv, email,
//         tested_url_homepage, tested_url, tested_on_date, tested_amount, tested_currency,
//         billing_address_if_asked, billing_phone_number, billing_name, declined_message,
//         not_tested_breakup, comments, id_verification_required, bypass_id_verification,
//         violation, tested_product, merchant_name_bill, log_generated, transaction_gmt_date,
//         account_number_masked, acquiring_identifier, acquiring_user_bid, acquirer_name,
//         acquiring_identifier_region, acquirer_region, acquiring_identifier_legal_country,
//         acquirer_country, merchant_name_acceptor, merchant_city, merchant_state_code,
//         merchant_state, merchant_country_code, merchant_country, merchant_category_code,
//         enriched_merchant_category, card_acceptor_id, card_acceptor_terminal_id,
//         pos_entry_mode, enriched_pos_entry_mode, pos_condition_code, pos_condition,
//         transaction_identifier, transaction_currency_code, eci_moto_group_code,
//         metrics, auth_transaction_count, transaction_amount_usd, auth_transaction_amount
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
//         $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
//         $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
//         $51, $52, $53
//       ) RETURNING *
//     `,
//       [
//         case_no,
//         test_successful,
//         card_no,
//         card_country,
//         expiry_date,
//         cvv,
//         email,
//         tested_url_homepage,
//         tested_url,
//         tested_on_date,
//         tested_amount,
//         tested_currency,
//         billing_address_if_asked,
//         billing_phone_number,
//         billing_name,
//         declined_message,
//         not_tested_breakup,
//         comments,
//         id_verification_required,
//         bypass_id_verification,
//         violation,
//         tested_product,
//         merchant_name_bill,
//         log_generated,
//         transaction_gmt_date,
//         account_number_masked,
//         acquiring_identifier,
//         acquiring_user_bid,
//         acquirer_name,
//         acquiring_identifier_region,
//         acquirer_region,
//         acquiring_identifier_legal_country,
//         acquirer_country,
//         merchant_name_acceptor,
//         merchant_city,
//         merchant_state_code,
//         merchant_state,
//         merchant_country_code,
//         merchant_country,
//         merchant_category_code,
//         enriched_merchant_category,
//         card_acceptor_id,
//         card_acceptor_terminal_id,
//         pos_entry_mode,
//         enriched_pos_entry_mode,
//         pos_condition_code,
//         pos_condition,
//         transaction_identifier,
//         transaction_currency_code,
//         eci_moto_group_code,
//         metrics,
//         auth_transaction_count,
//         transaction_amount_usd,
//         auth_transaction_amount,
//       ],
//     )

//     res.json({ success: true, data: result.rows[0] })
//   } catch (error) {
//     console.error("Error adding workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete workstream2 record
// app.delete("/api/workstream2/:id", async (req, res) => {
//   try {
//     const { id } = req.params
//     await pool.query("DELETE FROM workstream2_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })


// // Dashboard routes with different permissions
// app.get("/api/dashboard/admin", authenticateToken, checkPermission("dashboard", "admin-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Admin dashboard data",
//     data: {
//       totalUsers: 100,
//       totalWorkstreams: 50,
//       systemHealth: "Good",
//     },
//   })
// })

// app.get("/api/dashboard/viewer", authenticateToken, checkPermission("dashboard", "viewer-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Viewer dashboard data",
//     data: {
//       myWorkstreams: 5,
//       recentActivity: [],
//     },
//   })
// })

// // Route that requires multiple permissions
// app.get(
//   "/api/workstream/:id/sensitive",
//   authenticateToken,
//   checkAnyPermission([
//     { resource: "workstream", permission: "delete" },
//     { resource: "users", permission: "read" },
//   ]),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: "Sensitive workstream data",
//       data: { id: req.params.id },
//     })
//   },
// )

// // Test route
// app.get("/api/auth/test", (req, res) => {
//   res.json({
//     message: "🎉 ACL-powered auth system working!",
//     timestamp: new Date().toISOString(),
//   })
// })

// // === Auto-suggest URL APIs ===
// app.get("/api/website-sources", async (req, res) => {
//   const { search } = req.query
//   if (!search) return res.json([])
//   try {
//     const result = await pool.query("SELECT id, website_url FROM website_sources WHERE website_url ILIKE $1 LIMIT 10", [
//       `%${search}%`,
//     ])
//     res.json(result.rows)
//   } catch (error) {
//     console.error("❌ /api/website-sources error:", error.message)
//     res.status(500).json({ error: error.message })
//   }
// })

// // === Get All Workstream Entries ===
// app.get("/api/workspace_data", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       review_date: ensureDateString(row.review_date),
//       calculated_friday: ensureDateString(row.calculated_friday),
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json(formattedData)
//   } catch (err) {
//     console.error("❌ Error fetching all workspace data:", err)
//     res.status(500).json({ message: "Server Error", error: err.message })
//   }
// })

// // === Get Single Workstream Entry by ID ===
// app.get("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.id = $1
//     `,
//       [id],
//     )
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = result.rows[0]
//     const formattedRecord = {
//       ...record,
//       review_date: ensureDateString(record.review_date),
//       calculated_friday: ensureDateString(record.calculated_friday),
//       conditional_fields: record.conditional_fields
//         ? typeof record.conditional_fields === "string"
//           ? JSON.parse(record.conditional_fields)
//           : record.conditional_fields
//         : {},
//     }
//     res.json(formattedRecord)
//   } catch (err) {
//     console.error("❌ Error fetching workspace_data by ID:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Update Workstream Entry by ID ===
// app.put(
//   "/api/workspace_data/:id",
//   (req, res, next) => {
//     const contentType = req.get("Content-Type") || ""
//     if (contentType.includes("multipart/form-data")) {
//       upload.array("images", 10)(req, res, next)
//     } else {
//       next()
//     }
//   },
//   async (req, res) => {
//     const id = req.params.id
//     console.log("🔄 Updating record ID:", id)
//     try {
//       let formData
//       let newImageFiles = []
//       let existingImages = []
//       const contentType = req.get("Content-Type") || ""
//       if (contentType.includes("multipart/form-data")) {
//         formData = req.body
//         if (req.files && req.files.length > 0) {
//           newImageFiles = req.files.map((file) => ({
//             filename: file.filename,
//             originalname: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype,
//             url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//           }))
//         }
//         if (formData.existing_images) {
//           try {
//             existingImages = JSON.parse(formData.existing_images)
//           } catch (e) {
//             console.error("Error parsing existing images:", e)
//             existingImages = []
//           }
//         }
//       } else {
//         formData = req.body
//         if (formData.images) {
//           try {
//             existingImages = typeof formData.images === "string" ? JSON.parse(formData.images) : formData.images
//           } catch (e) {
//             console.error("Error parsing images:", e)
//             existingImages = []
//           }
//         }
//       }

//       const {
//         // New fields
//         fullName,
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         conditionalFields,
//         // Existing fields
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         owner_name,
//         review_date,
//         calculated_friday,
//         review_month,
//         review_year,
//         review_traffic,
//         website_source_id,
//         website_url,
//         aChecks,
//       } = formData

//       let finalWebsiteSourceId = website_source_id
//       if (website_url && (!website_source_id || website_source_id === "")) {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       }

//       const finalReviewDate = ensureDateString(review_date)
//       const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//       const { month, year } = getMonthAndYear(finalReviewDate)
//       const finalReviewMonth = review_month || month
//       const finalReviewYear = review_year || year

//       const allImages = [...existingImages, ...newImageFiles]
//       const imagesJSON = safeJSONStringify(allImages, "[]")

//       // Parse conditional fields - FIXED
//       let parsedConditionalFields = {}
//       if (conditionalFields) {
//         try {
//           parsedConditionalFields =
//             typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//           console.log("🔄 Update - Parsed conditional fields:", parsedConditionalFields)
//         } catch (e) {
//           console.error("Error parsing conditionalFields:", e)
//         }
//       }

//       const finalOwnerName = fullName || owner_name

//       const updateQuery = `
//       UPDATE workspace_data SET 
//         registration_type = $1, review_status = $2, review_reason = $3, review_type = $4,
//         registration_platform = $5, conditional_fields = $6::jsonb,
//         accessibility = $7, third_party_content = $8, conditional_response = $9, website_type = $10,
//         registration_site = $11, comments = $12, website_operator = $13, owner_name = $14,
//         review_date = $15::date, calculated_friday = $16::date, review_month = $17, review_year = $18,
//         review_traffic = $19, website_source_id = $20, a_checks = $21, images = $22
//       WHERE id = $23
//       RETURNING *
//     `

//       const updateValues = [
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         safeJSONStringify(parsedConditionalFields, "{}"), // Cast to JSONB
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         finalOwnerName,
//         finalReviewDate,
//         finalCalculatedFriday,
//         finalReviewMonth,
//         finalReviewYear,
//         review_traffic,
//         finalWebsiteSourceId,
//         aChecks || null,
//         imagesJSON,
//         id,
//       ]

//       const result = await pool.query(updateQuery, updateValues)

//       if (result.rows.length === 0) {
//         return res.status(404).json({ message: "Record not found" })
//       }

//       const updatedRecord = await pool.query(
//         `SELECT wd.*, ws.website_url FROM workspace_data wd
//        LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//        WHERE wd.id = $1`,
//         [id],
//       )

//       const formattedUpdatedRecord = {
//         ...updatedRecord.rows[0],
//         review_date: ensureDateString(updatedRecord.rows[0].review_date),
//         calculated_friday: ensureDateString(updatedRecord.rows[0].calculated_friday),
//         conditional_fields: updatedRecord.rows[0].conditional_fields
//           ? typeof updatedRecord.rows[0].conditional_fields === "string"
//             ? JSON.parse(updatedRecord.rows[0].conditional_fields)
//             : updatedRecord.rows[0].conditional_fields
//           : {},
//       }

//       console.log("✅ Update successful")
//       res.json({
//         message: "Record updated successfully",
//         data: formattedUpdatedRecord,
//       })
//     } catch (err) {
//       console.error("❌ Error updating workspace_data:", err)
//       if (req.files) {
//         req.files.forEach((file) => {
//           fs.unlink(file.path, (err) => {
//             if (err) console.error("Error deleting file:", err)
//           })
//         })
//       }
//       res.status(500).json({ message: "Server error", error: err.message })
//     }
//   },
// )

// // === Delete Workstream Entry by ID ===
// app.delete("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const existingRecord = await pool.query("SELECT images FROM workspace_data WHERE id = $1", [id])
//     if (existingRecord.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = existingRecord.rows[0]
//     if (record.images) {
//       try {
//         const images = typeof record.images === "string" ? JSON.parse(record.images) : record.images
//         if (Array.isArray(images)) {
//           images.forEach((image) => {
//             if (image.filename) {
//               const filePath = path.join(__dirname, "uploads", image.filename)
//               fs.unlink(filePath, (err) => {
//                 if (err) console.error("❌ Error deleting image file:", err)
//               })
//             }
//           })
//         }
//       } catch (parseError) {
//         console.error("❌ Error parsing images for cleanup:", parseError)
//       }
//     }
//     const deleteResult = await pool.query("DELETE FROM workspace_data WHERE id = $1 RETURNING id", [id])
//     if (deleteResult.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     res.json({ message: "Record deleted successfully", deletedId: id })
//   } catch (err) {
//     console.error("❌ Error deleting workspace_data:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Error handling ===
// app.use((error, req, res, next) => {
//   console.error("❌ Unhandled error:", error)
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//   })
// })

// // === 404 handler ===
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.method} ${req.originalUrl} not found`,
//   })
// })

// // Start server
// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`)
//   console.log(`🔐 Auth test: http://localhost:${port}/api/auth/test`)
//   console.log(`👤 User permissions: http://localhost:${port}/api/auth/permissions`)
//   console.log("📋 ACL-Protected Routes:")
//   console.log("  GET  /api/admin/users - Admin only (users:read)")
//   console.log("  POST /api/admin/users - Admin only (users:create)")
//   console.log("  DELETE /api/admin/users/:id - Admin only (users:delete)")
//   console.log("  GET  /api/workstream - Read workstream (workstream:read)")
//   console.log("  POST /api/workstream - Create workstream (workstream:create)")
//   console.log("  GET  /api/dashboard/admin - Admin dashboard (dashboard:admin-view)")
//   console.log("  GET  /api/dashboard/viewer - Viewer dashboard (dashboard:viewer-view)")
//   console.log("📋 Workstream Routes:")
//   console.log("  GET  /api/open/workstream - Get workstream1 data")
//   console.log("  GET  /api/open/workstream/:workstreamId - Get specific workstream data")
//   console.log("  POST /api/open/workstream-list - Add new workstream")
//   console.log("  GET  /api/open/workstream-list - Get all workstreams")
// })




// const express = require("express")
// const cors = require("cors")
// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const { Pool } = require("pg")
// const multer = require("multer")
// const path = require("path")
// const fs = require("fs")
// const ACL = require("acl")
// require("dotenv").config()

// const app = express()
// const port = process.env.PORT || 5000

// // JWT Secret
// const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey123!@#"

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, "uploads")
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true })
// }

// // === Middleware ===
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   }),
// )
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads"))

// // === Multer File Upload Config ===
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
//     cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
//   },
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
//   fileFilter: (req, file, cb) => {
//     file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed!"), false)
//   },
// })

// // === PostgreSQL Connection ===
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "Workstream1",
//   password: "Ayansh@03",
//   port: 5432,
// })

// // === ACL Setup ===
// let acl
// const initializeACL = async () => {
//   try {
//     acl = new ACL(new ACL.memoryBackend())
//     await acl.allow([
//       {
//         roles: ["admin"],
//         allows: [
//           { resources: "users", permissions: ["create", "read", "update", "delete"] },
//           { resources: "workstream", permissions: ["create", "read", "update", "delete"] },
//           { resources: "dashboard", permissions: ["read", "admin-view"] },
//           { resources: "reports", permissions: ["create", "read", "update", "delete"] },
//           { resources: "settings", permissions: ["read", "update"] },
//         ],
//       },
//       {
//         roles: ["viewer"],
//         allows: [
//           { resources: "workstream", permissions: ["read"] },
//           { resources: "dashboard", permissions: ["read", "viewer-view"] },
//           { resources: "reports", permissions: ["read"] },
//           { resources: "profile", permissions: ["read", "update"] },
//         ],
//       },
//     ])
//     await acl.addRoleParents("admin", ["viewer"])
//     console.log("✅ ACL initialized successfully")
//   } catch (error) {
//     console.error("❌ ACL initialization error:", error)
//   }
// }
// initializeACL()

// // === Authentication Middleware ===
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"]
//   const token = authHeader && authHeader.split(" ")[1]
//   if (!token) {
//     return res.status(401).json({ message: "Access token required" })
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET)
//     const user = pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.userId])
//     if (user.rows.length === 0) {
//       return res.status(401).json({ message: "User not found" })
//     }
//     req.user = user.rows[0]
//     next()
//   } catch (error) {
//     console.error("Token verification error:", error)
//     return res.status(403).json({ message: "Invalid or expired token" })
//   }
// }

// // === ACL Authorization Middleware ===
// const checkPermission = (resource, permission) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       const hasPermission = await acl.isAllowed(userId, resource, permission)
//       if (!hasPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: { resource, permission },
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Helper function to check multiple permissions ===
// const checkAnyPermission = (permissions) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       let hasAnyPermission = false
//       for (const { resource, permission } of permissions) {
//         const allowed = await acl.isAllowed(userId, resource, permission)
//         if (allowed) {
//           hasAnyPermission = true
//           break
//         }
//       }
//       if (!hasAnyPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: permissions,
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL multiple permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Date handling functions ===
// const isValidDateString = (dateStr) => {
//   if (!dateStr || typeof dateStr !== "string") return false
//   const dateRegex = /^\d{4}-\d{2}-\d{2}$/
//   if (!dateRegex.test(dateStr)) return false
//   const [year, month, day] = dateStr.split("-").map(Number)
//   return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
// }

// const getFridayOfWeek = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     console.error("❌ Invalid date string:", dateStr)
//     return null
//   }
//   try {
//     const [year, month, day] = dateStr.split("-").map(Number)
//     let adjustedMonth = month
//     let adjustedYear = year
//     if (month < 3) {
//       adjustedMonth += 12
//       adjustedYear -= 1
//     }
//     const q = day
//     const m = adjustedMonth
//     const k = adjustedYear % 100
//     const j = Math.floor(adjustedYear / 100)
//     const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
//     const dayOfWeek = (h + 5) % 7
//     const daysToFriday = (4 - dayOfWeek + 7) % 7
//     let fridayDay = day + daysToFriday
//     let fridayMonth = month
//     let fridayYear = year
//     const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
//     if (fridayYear % 4 === 0 && (fridayYear % 100 !== 0 || fridayYear % 400 === 0)) {
//       daysInMonth[1] = 29
//     }
//     if (fridayDay > daysInMonth[fridayMonth - 1]) {
//       fridayDay = fridayDay - daysInMonth[fridayMonth - 1]
//       fridayMonth += 1
//       if (fridayMonth > 12) {
//         fridayMonth = 1
//         fridayYear += 1
//       }
//     }
//     const result = `${fridayYear}-${String(fridayMonth).padStart(2, "0")}-${String(fridayDay).padStart(2, "0")}`
//     return result
//   } catch (error) {
//     console.error("❌ Error calculating Friday:", error)
//     return null
//   }
// }

// const getMonthAndYear = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     return { month: null, year: null }
//   }
//   try {
//     const [year, month] = dateStr.split("-").map(Number)
//     const monthNames = [
//       "January",
//       "February",
//       "March",
//       "April",
//       "May",
//       "June",
//       "July",
//       "August",
//       "September",
//       "October",
//       "November",
//       "December",
//     ]
//     return {
//       month: monthNames[month - 1],
//       year: year,
//     }
//   } catch (error) {
//     console.error("❌ Error calculating month/year:", error)
//     return { month: null, year: null }
//   }
// }

// const ensureDateString = (dateValue) => {
//   if (!dateValue) return null
//   if (typeof dateValue === "string" && isValidDateString(dateValue)) {
//     return dateValue
//   }
//   if (dateValue instanceof Date) {
//     const year = dateValue.getFullYear()
//     const month = String(dateValue.getMonth() + 1).padStart(2, "0")
//     const day = String(dateValue.getDate()).padStart(2, "0")
//     return `${year}-${month}-${day}`
//   }
//   if (typeof dateValue === "string" && dateValue.includes("T")) {
//     const datePart = dateValue.split("T")[0]
//     if (isValidDateString(datePart)) {
//       return datePart
//     }
//   }
//   console.error("❌ Could not convert to date string:", dateValue)
//   return null
// }

// const safeJSONStringify = (data, fallback = "[]") => {
//   try {
//     if (data === null || data === undefined) {
//       return fallback
//     }
//     if (typeof data === "string") {
//       const parsed = JSON.parse(data)
//       return JSON.stringify(parsed)
//     }
//     return JSON.stringify(data)
//   } catch (error) {
//     console.error("❌ JSON stringify error:", error)
//     return fallback
//   }
// }

// // === ROUTES ===

// // User list
// app.get("/api/open/users", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({ success: true, users: result.rows })
//   } catch (err) {
//     console.error("Error fetching users:", err.message)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete user item
// app.post("/api/admin/delete-users", async (req, res) => {
//   const { ids } = req.body
//   if (!Array.isArray(ids) || ids.length === 0) {
//     return res.status(400).json({ message: "No user IDs provided" })
//   }
//   try {
//     const result = await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids])
//     res.status(200).json({ message: "Users deleted successfully", deleted: result.rowCount })
//   } catch (error) {
//     console.error("Delete error:", error)
//     res.status(500).json({ message: "Internal server error" })
//   }
// })

// // Workstream listing (Original workstream1 data)
// app.get("/api/open/workstream", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching open workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get specific workstream data by workstream ID (NEW ENDPOINT)
// app.get("/api/open/workstream/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // If it's workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query(`
//         SELECT 
//           wd.*,
//           ws.website_url
//         FROM workspace_data wd
//         LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//         ORDER BY wd.id DESC
//       `)

//       const formattedData = result.rows.map((row) => ({
//         ...row,
//         conditional_fields: row.conditional_fields
//           ? typeof row.conditional_fields === "string"
//             ? JSON.parse(row.conditional_fields)
//             : row.conditional_fields
//           : {},
//       }))

//       return res.json({
//         success: true,
//         data: formattedData,
//       })
//     }

//     // For workstream2, use the workstream2_data table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(`
//         SELECT * FROM workstream2_data 
//         ORDER BY created_at DESC
//       `)

//       return res.json({
//         success: true,
//         data: result.rows,
//       })
//     }

//     // For other dynamic workstreams, fetch data based on workstream_id
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.workstream_id = $1
//       ORDER BY wd.id DESC
//     `,
//       [workstreamId],
//     )

//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // For GET /api/open/workstream1
// app.get("/api/open/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({ success: true, data: formattedData })
//   } catch (err) {
//     console.error("Error fetching workstream1 data:", err)
//     res.status(500).json({ success: false, message: "Internal Server Error" })
//   }
// })

// // Delete workstream data by ID
// app.delete("/api/open/workstream/:id", async (req, res) => {
//   const { id } = req.params
//   try {
//     await pool.query("DELETE FROM workspace_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream record:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream data active for fields
// app.get("/api/fields/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//     res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.get("/api/admin/field-config", async (req, res) => {
//   const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//   res.json({ success: true, data: result.rows })
// })

// app.put("/api/admin/field-config/:fieldName", async (req, res) => {
//   const { fieldName } = req.params
//   const { is_active } = req.body
//   try {
//     await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [is_active, fieldName])
//     res.json({ success: true })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === DYNAMIC API ROUTES FOR WORKSTREAMS ===

// // Get all workstreams (for the workstreams page)
// app.get("/api/admin/workstreams", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get field configuration for a specific workstream (DYNAMIC)
// app.get("/api/admin/workstream/:workstreamId/field-config", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // For workstream1, use the existing field config table
//     if (workstreamId === "workstream1") {
//       const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//       return res.json({ success: true, data: result.rows })
//     }

//     // For workstream2, use the new dynamic field config table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")
//       return res.json({ success: true, data: result.rows })
//     }

//     // For other workstreams, return empty array for now
//     res.json({ success: true, data: [] })
//   } catch (error) {
//     console.error("Error fetching field config:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Update field configuration for a specific workstream (DYNAMIC)
// app.put("/api/admin/workstream/:workstreamId/field-config/:fieldName", async (req, res) => {
//   const { workstreamId, fieldName } = req.params
//   const { is_active } = req.body

//   try {
//     // For workstream1, update the existing table
//     if (workstreamId === "workstream1") {
//       await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [
//         is_active,
//         fieldName,
//       ])
//       return res.json({ success: true })
//     }

//     // For workstream2, update the new dynamic table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "UPDATE workstream2_field_config SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE field_name = $2 RETURNING *",
//         [is_active, fieldName],
//       )

//       if (result.rows.length === 0) {
//         return res.status(404).json({ success: false, message: "Field not found" })
//       }

//       return res.json({ success: true, data: result.rows[0] })
//     }

//     // For other workstreams, just return success
//     res.json({ success: true, message: `Field ${fieldName} updated for ${workstreamId}` })
//   } catch (err) {
//     console.error("Error updating field config:", err)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get active fields for a specific workstream (DYNAMIC)
// app.get("/api/fields/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // For workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//       return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//     }

//     // For workstream2, use the dynamic field config table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "SELECT field_name FROM workstream2_field_config WHERE is_active = TRUE ORDER BY field_order, id",
//       )
//       return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//     }

//     // For other workstreams, return empty array
//     res.json({ success: true, fields: [] })
//   } catch (err) {
//     console.error("Error fetching active fields:", err)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === AUTHENTICATION ROUTES ===

// // Register Route
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     console.log("📝 Registration attempt for:", email, "Role:", role)
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       })
//     }
//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 6 characters long",
//       })
//     }
//     if (!["admin", "viewer"].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Role must be either 'admin' or 'viewer'",
//       })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email already exists",
//       })
//     }
//     const saltRounds = 10
//     const hashedPassword = await bcrypt.hash(password, saltRounds)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     const user = newUser.rows[0]
//     await acl.addUserRoles(user.id.toString(), role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Registration successful for:", email, "Role:", role)
//     res.json({
//       success: true,
//       message: "Registration successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         created_at: user.created_at,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Registration error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Login Route
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body
//     console.log("🔐 Login attempt for:", email)
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required",
//       })
//     }
//     const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
//     if (userResult.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     const user = userResult.rows[0]
//     const isValidPassword = await bcrypt.compare(password, user.password)
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     await acl.addUserRoles(user.id.toString(), user.role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Login successful for:", email, "Role:", user.role)
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Get user profile
// app.get("/api/auth/profile", authenticateToken, (req, res) => {
//   res.json({
//     success: true,
//     user: req.user,
//   })
// })

// // Workstreams API (Dynamic workstreams)
// app.post("/api/open/workstream-list", async (req, res) => {
//   const { name } = req.body
//   if (!name) return res.status(400).json({ success: false, message: "Name is required" })
//   try {
//     const result = await pool.query("INSERT INTO workstreams (name) VALUES ($1) RETURNING *", [name])
//     res.json({ success: true, data: result.rows[0] })
//   } catch (err) {
//     console.error("Error adding workstream:", err)
//     res.status(500).json({ success: false, message: "Failed to add workstream" })
//   }
// })

// app.get("/api/open/workstream-list", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get user permissions
// app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id.toString()
//     const userRoles = await acl.userRoles(userId)
//     const permissions = {}
//     const resources = ["users", "workstream", "dashboard", "reports", "settings", "profile"]
//     const permissionTypes = ["create", "read", "update", "delete", "admin-view", "viewer-view"]
//     for (const resource of resources) {
//       permissions[resource] = {}
//       for (const permission of permissionTypes) {
//         permissions[resource][permission] = await acl.isAllowed(userId, resource, permission)
//       }
//     }
//     res.json({
//       success: true,
//       user: req.user,
//       roles: userRoles,
//       permissions: permissions,
//     })
//   } catch (error) {
//     console.error("Error fetching permissions:", error)
//     res.status(500).json({ success: false, message: "Error fetching permissions" })
//   }
// })

// // === PROTECTED ROUTES WITH ACL ===

// // Admin only - Get all users
// app.get("/api/admin/users", authenticateToken, checkPermission("users", "read"), async (req, res) => {
//   try {
//     const users = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({
//       success: true,
//       users: users.rows,
//     })
//   } catch (error) {
//     console.error("Error fetching users:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Create user
// app.post("/api/admin/users", authenticateToken, checkPermission("users", "create"), async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     if (!name || !email || !password) {
//       return res.status(400).json({ success: false, message: "Name, email, and password are required" })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ success: false, message: "User already exists" })
//     }
//     const hashedPassword = await bcrypt.hash(password, 10)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     await acl.addUserRoles(newUser.rows[0].id.toString(), role)
//     res.json({
//       success: true,
//       message: "User created successfully",
//       user: newUser.rows[0],
//     })
//   } catch (error) {
//     console.error("Error creating user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Delete user
// app.delete("/api/admin/users/:id", authenticateToken, checkPermission("users", "delete"), async (req, res) => {
//   try {
//     const userId = req.params.id
//     await acl.removeUserRoles(userId, await acl.userRoles(userId))
//     const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])
//     if (result.rows.length === 0) {
//       return res.status(404).json({ success: false, message: "User not found" })
//     }
//     res.json({
//       success: true,
//       message: "User deleted successfully",
//     })
//   } catch (error) {
//     console.error("Error deleting user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream routes with ACL protection
// app.get("/api/workstream", authenticateToken, checkPermission("workstream", "read"), async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data ORDER BY id DESC")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === MAIN WORKSTREAM SUBMISSION ROUTE ===
// app.post("/api/workstream", upload.array("images", 10), async (req, res) => {
//   try {
//     const {
//       // ===== NEW FIELDS (From Reviewer Form) =====
//       fullName, // Maps to owner_name
//       registrationType, // Registration Type dropdown
//       reviewStatus, // Completed/Not Completed
//       reviewReason, // Reason when Not Completed
//       reviewType, // New Review/Re-Review
//       registrationPlatform, // Registration platform text
//       conditionalFields, // A1, A2, A3... fields
//       // ===== EXISTING FIELDS =====
//       accessibility,
//       third_party_content,
//       conditional_response,
//       website_type,
//       registration_site,
//       comments,
//       website_operator,
//       owner_name, // Keep this for backward compatibility
//       review_date,
//       calculated_friday,
//       review_month,
//       review_year,
//       review_traffic,
//       website_source_id,
//       website_url,
//       aChecks,
//     } = req.body

//     console.log("📝 Form submission received:")
//     console.log("New fields:", {
//       fullName,
//       registrationType,
//       reviewStatus,
//       reviewReason,
//       reviewType,
//       registrationPlatform,
//     })
//     console.log("🔧 Conditional fields received:", conditionalFields)
//     console.log("Existing fields:", { accessibility, third_party_content, website_url, owner_name })

//     // Handle website source ID
//     let finalWebsiteSourceId = website_source_id
//     if (!website_source_id && website_url) {
//       try {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       } catch (urlError) {
//         console.error("❌ Error handling website URL:", urlError)
//         throw new Error(`Website URL error: ${urlError.message}`)
//       }
//     }

//     const finalReviewDate = ensureDateString(review_date)
//     const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//     const { month, year } = getMonthAndYear(finalReviewDate)
//     const finalReviewMonth = review_month || month
//     const finalReviewYear = review_year || year

//     // Process images
//     let imageData = []
//     if (req.files && req.files.length > 0) {
//       imageData = req.files.map((file) => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         size: file.size,
//         mimetype: file.mimetype,
//         url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//       }))
//     }

//     // Parse aChecks
//     let parsedAChecks = []
//     if (aChecks) {
//       try {
//         parsedAChecks = typeof aChecks === "string" ? JSON.parse(aChecks) : aChecks
//       } catch (parseError) {
//         console.error("❌ Error parsing aChecks:", parseError)
//         parsedAChecks = []
//       }
//     }

//     // Parse conditional fields - FIXED
//     let parsedConditionalFields = {}
//     if (conditionalFields) {
//       try {
//         parsedConditionalFields =
//           typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//         console.log("✅ Parsed conditional fields:", parsedConditionalFields)
//       } catch (parseError) {
//         console.error("❌ Error parsing conditionalFields:", parseError)
//         parsedConditionalFields = {}
//       }
//     }

//     const imagesJSON = safeJSONStringify(imageData, "[]")
//     const aChecksJSON = safeJSONStringify(parsedAChecks, "[]")
//     const conditionalFieldsJSON = safeJSONStringify(parsedConditionalFields, "{}")

//     console.log("💾 Final conditional fields JSON:", conditionalFieldsJSON)

//     // Use fullName if provided, otherwise use owner_name
//     const finalOwnerName = fullName || owner_name

//     const insertQuery = `
//       INSERT INTO workspace_data (
//         registration_type, review_status, review_reason, review_type,
//         registration_platform, conditional_fields,
//         accessibility, third_party_content, conditional_response, website_type,
//         registration_site, comments, website_operator, owner_name, 
//         review_date, calculated_friday, review_month, review_year,
//         review_traffic, images, a_checks, website_source_id
//       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19, $20, $21, $22)
//       RETURNING id, review_date, calculated_friday, conditional_fields
//     `

//     const insertValues = [
//       // New fields
//       registrationType || null,
//       reviewStatus || null,
//       reviewReason || null,
//       reviewType || null,
//       registrationPlatform || null,
//       conditionalFieldsJSON, // This will be cast to JSONB
//       // Existing fields
//       accessibility || null,
//       third_party_content || null,
//       conditional_response || null,
//       website_type || null,
//       registration_site || null,
//       comments || null,
//       website_operator || null,
//       finalOwnerName || null,
//       finalReviewDate,
//       finalCalculatedFriday,
//       finalReviewMonth,
//       finalReviewYear,
//       review_traffic || null,
//       imagesJSON,
//       aChecksJSON,
//       finalWebsiteSourceId || null,
//     ]

//     console.log("💾 Inserting data with conditional fields:", conditionalFieldsJSON)

//     const result = await pool.query(insertQuery, insertValues)

//     console.log("✅ Form submitted successfully with ID:", result.rows[0].id)
//     console.log("✅ Stored conditional fields:", result.rows[0].conditional_fields)

//     res.status(200).json({
//       message: "Reviewer form submitted successfully!",
//       id: result.rows[0].id,
//       images: imageData,
//       website_source_id: finalWebsiteSourceId,
//       stored_review_date: ensureDateString(result.rows[0].review_date),
//       stored_calculated_friday: ensureDateString(result.rows[0].calculated_friday),
//       calculated_friday: finalCalculatedFriday,
//       review_month: finalReviewMonth,
//       review_year: finalReviewYear,
//       conditional_fields: result.rows[0].conditional_fields,
//     })
//   } catch (error) {
//     console.error("💥 === FORM SUBMISSION ERROR ===")
//     console.error("Error:", error)
//     if (req.files) {
//       req.files.forEach((file) => {
//         fs.unlink(file.path, (err) => {
//           if (err) console.error("Error deleting file:", err)
//         })
//       })
//     }
//     res.status(500).json({
//       error: "Failed to submit workstream data",
//       message: error.message,
//     })
//   }
// })

// // workstream2 - Get all workstream2 data
// app.get("/api/workstream2", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT * FROM workstream2_data 
//       ORDER BY created_at DESC
//     `)
//     res.json({ success: true, data: result.rows })
//   } catch (error) {
//     console.error("Error fetching workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Add new workstream2 record
// app.post("/api/workstream2", async (req, res) => {
//   try {
//     const {
//       case_no,
//       test_successful,
//       card_no,
//       card_country,
//       expiry_date,
//       cvv,
//       email,
//       tested_url_homepage,
//       tested_url,
//       tested_on_date,
//       tested_amount,
//       tested_currency,
//       billing_address_if_asked,
//       billing_phone_number,
//       billing_name,
//       declined_message,
//       not_tested_breakup,
//       comments,
//       id_verification_required,
//       bypass_id_verification,
//       violation,
//       tested_product,
//       merchant_name_bill,
//       log_generated,
//       transaction_gmt_date,
//       account_number_masked,
//       acquiring_identifier,
//       acquiring_user_bid,
//       acquirer_name,
//       acquiring_identifier_region,
//       acquirer_region,
//       acquiring_identifier_legal_country,
//       acquirer_country,
//       merchant_name_acceptor,
//       merchant_city,
//       merchant_state_code,
//       merchant_state,
//       merchant_country_code,
//       merchant_country,
//       merchant_category_code,
//       enriched_merchant_category,
//       card_acceptor_id,
//       card_acceptor_terminal_id,
//       pos_entry_mode,
//       enriched_pos_entry_mode,
//       pos_condition_code,
//       pos_condition,
//       transaction_identifier,
//       transaction_currency_code,
//       eci_moto_group_code,
//       metrics,
//       auth_transaction_count,
//       transaction_amount_usd,
//       auth_transaction_amount,
//     } = req.body

//     const result = await pool.query(
//       `
//       INSERT INTO workstream2_data (
//         case_no, test_successful, card_no, card_country, expiry_date, cvv, email,
//         tested_url_homepage, tested_url, tested_on_date, tested_amount, tested_currency,
//         billing_address_if_asked, billing_phone_number, billing_name, declined_message,
//         not_tested_breakup, comments, id_verification_required, bypass_id_verification,
//         violation, tested_product, merchant_name_bill, log_generated, transaction_gmt_date,
//         account_number_masked, acquiring_identifier, acquiring_user_bid, acquirer_name,
//         acquiring_identifier_region, acquirer_region, acquiring_identifier_legal_country,
//         acquirer_country, merchant_name_acceptor, merchant_city, merchant_state_code,
//         merchant_state, merchant_country_code, merchant_country, merchant_category_code,
//         enriched_merchant_category, card_acceptor_id, card_acceptor_terminal_id,
//         pos_entry_mode, enriched_pos_entry_mode, pos_condition_code, pos_condition,
//         transaction_identifier, transaction_currency_code, eci_moto_group_code,
//         metrics, auth_transaction_count, transaction_amount_usd, auth_transaction_amount
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
//         $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
//         $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
//         $51, $52, $53
//       ) RETURNING *
//     `,
//       [
//         case_no,
//         test_successful,
//         card_no,
//         card_country,
//         expiry_date,
//         cvv,
//         email,
//         tested_url_homepage,
//         tested_url,
//         tested_on_date,
//         tested_amount,
//         tested_currency,
//         billing_address_if_asked,
//         billing_phone_number,
//         billing_name,
//         declined_message,
//         not_tested_breakup,
//         comments,
//         id_verification_required,
//         bypass_id_verification,
//         violation,
//         tested_product,
//         merchant_name_bill,
//         log_generated,
//         transaction_gmt_date,
//         account_number_masked,
//         acquiring_identifier,
//         acquiring_user_bid,
//         acquirer_name,
//         acquiring_identifier_region,
//         acquirer_region,
//         acquiring_identifier_legal_country,
//         acquirer_country,
//         merchant_name_acceptor,
//         merchant_city,
//         merchant_state_code,
//         merchant_state,
//         merchant_country_code,
//         merchant_country,
//         merchant_category_code,
//         enriched_merchant_category,
//         card_acceptor_id,
//         card_acceptor_terminal_id,
//         pos_entry_mode,
//         enriched_pos_entry_mode,
//         pos_condition_code,
//         pos_condition,
//         transaction_identifier,
//         transaction_currency_code,
//         eci_moto_group_code,
//         metrics,
//         auth_transaction_count,
//         transaction_amount_usd,
//         auth_transaction_amount,
//       ],
//     )

//     res.json({ success: true, data: result.rows[0] })
//   } catch (error) {
//     console.error("Error adding workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete workstream2 record
// app.delete("/api/workstream2/:id", async (req, res) => {
//   try {
//     const { id } = req.params
//     await pool.query("DELETE FROM workstream2_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Dashboard routes with different permissions
// app.get("/api/dashboard/admin", authenticateToken, checkPermission("dashboard", "admin-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Admin dashboard data",
//     data: {
//       totalUsers: 100,
//       totalWorkstreams: 50,
//       systemHealth: "Good",
//     },
//   })
// })

// app.get("/api/dashboard/viewer", authenticateToken, checkPermission("dashboard", "viewer-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Viewer dashboard data",
//     data: {
//       myWorkstreams: 5,
//       recentActivity: [],
//     },
//   })
// })

// // Route that requires multiple permissions
// app.get(
//   "/api/workstream/:id/sensitive",
//   authenticateToken,
//   checkAnyPermission([
//     { resource: "workstream", permission: "delete" },
//     { resource: "users", permission: "read" },
//   ]),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: "Sensitive workstream data",
//       data: { id: req.params.id },
//     })
//   },
// )

// // Test route
// app.get("/api/auth/test", (req, res) => {
//   res.json({
//     message: "🎉 ACL-powered auth system working!",
//     timestamp: new Date().toISOString(),
//   })
// })

// // === Auto-suggest URL APIs ===
// app.get("/api/website-sources", async (req, res) => {
//   const { search } = req.query
//   if (!search) return res.json([])
//   try {
//     const result = await pool.query("SELECT id, website_url FROM website_sources WHERE website_url ILIKE $1 LIMIT 10", [
//       `%${search}%`,
//     ])
//     res.json(result.rows)
//   } catch (error) {
//     console.error("❌ /api/website-sources error:", error.message)
//     res.status(500).json({ error: error.message })
//   }
// })

// // === Get All Workstream Entries ===
// app.get("/api/workspace_data", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       review_date: ensureDateString(row.review_date),
//       calculated_friday: ensureDateString(row.calculated_friday),
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json(formattedData)
//   } catch (err) {
//     console.error("❌ Error fetching all workspace data:", err)
//     res.status(500).json({ message: "Server Error", error: err.message })
//   }
// })

// // === Get Single Workstream Entry by ID ===
// app.get("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.id = $1
//     `,
//       [id],
//     )
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = result.rows[0]
//     const formattedRecord = {
//       ...record,
//       review_date: ensureDateString(record.review_date),
//       calculated_friday: ensureDateString(record.calculated_friday),
//       conditional_fields: record.conditional_fields
//         ? typeof record.conditional_fields === "string"
//           ? JSON.parse(record.conditional_fields)
//           : record.conditional_fields
//         : {},
//     }
//     res.json(formattedRecord)
//   } catch (err) {
//     console.error("❌ Error fetching workspace_data by ID:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Update Workstream Entry by ID ===
// app.put(
//   "/api/workspace_data/:id",
//   (req, res, next) => {
//     const contentType = req.get("Content-Type") || ""
//     if (contentType.includes("multipart/form-data")) {
//       upload.array("images", 10)(req, res, next)
//     } else {
//       next()
//     }
//   },
//   async (req, res) => {
//     const id = req.params.id
//     console.log("🔄 Updating record ID:", id)
//     try {
//       let formData
//       let newImageFiles = []
//       let existingImages = []
//       const contentType = req.get("Content-Type") || ""
//       if (contentType.includes("multipart/form-data")) {
//         formData = req.body
//         if (req.files && req.files.length > 0) {
//           newImageFiles = req.files.map((file) => ({
//             filename: file.filename,
//             originalname: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype,
//             url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//           }))
//         }
//         if (formData.existing_images) {
//           try {
//             existingImages = JSON.parse(formData.existing_images)
//           } catch (e) {
//             console.error("Error parsing existing images:", e)
//             existingImages = []
//           }
//         }
//       } else {
//         formData = req.body
//         if (formData.images) {
//           try {
//             existingImages = typeof formData.images === "string" ? JSON.parse(formData.images) : formData.images
//           } catch (e) {
//             console.error("Error parsing images:", e)
//             existingImages = []
//           }
//         }
//       }

//       const {
//         // New fields
//         fullName,
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         conditionalFields,
//         // Existing fields
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         owner_name,
//         review_date,
//         calculated_friday,
//         review_month,
//         review_year,
//         review_traffic,
//         website_source_id,
//         website_url,
//         aChecks,
//       } = formData

//       let finalWebsiteSourceId = website_source_id
//       if (website_url && (!website_source_id || website_source_id === "")) {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       }

//       const finalReviewDate = ensureDateString(review_date)
//       const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//       const { month, year } = getMonthAndYear(finalReviewDate)
//       const finalReviewMonth = review_month || month
//       const finalReviewYear = review_year || year

//       const allImages = [...existingImages, ...newImageFiles]
//       const imagesJSON = safeJSONStringify(allImages, "[]")

//       // Parse conditional fields - FIXED
//       let parsedConditionalFields = {}
//       if (conditionalFields) {
//         try {
//           parsedConditionalFields =
//             typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//           console.log("🔄 Update - Parsed conditional fields:", parsedConditionalFields)
//         } catch (e) {
//           console.error("Error parsing conditionalFields:", e)
//         }
//       }

//       const finalOwnerName = fullName || owner_name

//       const updateQuery = `
//       UPDATE workspace_data SET 
//         registration_type = $1, review_status = $2, review_reason = $3, review_type = $4,
//         registration_platform = $5, conditional_fields = $6::jsonb,
//         accessibility = $7, third_party_content = $8, conditional_response = $9, website_type = $10,
//         registration_site = $11, comments = $12, website_operator = $13, owner_name = $14,
//         review_date = $15::date, calculated_friday = $16::date, review_month = $17, review_year = $18,
//         review_traffic = $19, website_source_id = $20, a_checks = $21, images = $22
//       WHERE id = $23
//       RETURNING *
//     `

//       const updateValues = [
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         safeJSONStringify(parsedConditionalFields, "{}"), // Cast to JSONB
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         finalOwnerName,
//         finalReviewDate,
//         finalCalculatedFriday,
//         finalReviewMonth,
//         finalReviewYear,
//         review_traffic,
//         finalWebsiteSourceId,
//         aChecks || null,
//         imagesJSON,
//         id,
//       ]

//       const result = await pool.query(updateQuery, updateValues)

//       if (result.rows.length === 0) {
//         return res.status(404).json({ message: "Record not found" })
//       }

//       const updatedRecord = await pool.query(
//         `SELECT wd.*, ws.website_url FROM workspace_data wd
//        LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//        WHERE wd.id = $1`,
//         [id],
//       )

//       const formattedUpdatedRecord = {
//         ...updatedRecord.rows[0],
//         review_date: ensureDateString(updatedRecord.rows[0].review_date),
//         calculated_friday: ensureDateString(updatedRecord.rows[0].calculated_friday),
//         conditional_fields: updatedRecord.rows[0].conditional_fields
//           ? typeof updatedRecord.rows[0].conditional_fields === "string"
//             ? JSON.parse(updatedRecord.rows[0].conditional_fields)
//             : updatedRecord.rows[0].conditional_fields
//           : {},
//       }

//       console.log("✅ Update successful")
//       res.json({
//         message: "Record updated successfully",
//         data: formattedUpdatedRecord,
//       })
//     } catch (err) {
//       console.error("❌ Error updating workspace_data:", err)
//       if (req.files) {
//         req.files.forEach((file) => {
//           fs.unlink(file.path, (err) => {
//             if (err) console.error("Error deleting file:", err)
//           })
//         })
//       }
//       res.status(500).json({ message: "Server error", error: err.message })
//     }
//   },
// )

// // === Delete Workstream Entry by ID ===
// app.delete("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const existingRecord = await pool.query("SELECT images FROM workspace_data WHERE id = $1", [id])
//     if (existingRecord.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = existingRecord.rows[0]
//     if (record.images) {
//       try {
//         const images = typeof record.images === "string" ? JSON.parse(record.images) : record.images
//         if (Array.isArray(images)) {
//           images.forEach((image) => {
//             if (image.filename) {
//               const filePath = path.join(__dirname, "uploads", image.filename)
//               fs.unlink(filePath, (err) => {
//                 if (err) console.error("❌ Error deleting image file:", err)
//               })
//             }
//           })
//         }
//       } catch (parseError) {
//         console.error("❌ Error parsing images for cleanup:", parseError)
//       }
//     }
//     const deleteResult = await pool.query("DELETE FROM workspace_data WHERE id = $1 RETURNING id", [id])
//     if (deleteResult.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     res.json({ message: "Record deleted successfully", deletedId: id })
//   } catch (err) {
//     console.error("❌ Error deleting workspace_data:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Error handling ===
// app.use((error, req, res, next) => {
//   console.error("❌ Unhandled error:", error)
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//   })
// })

// // === 404 handler ===
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.method} ${req.originalUrl} not found`,
//   })
// })

// // Start server
// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`)
//   console.log(`🔐 Auth test: http://localhost:${port}/api/auth/test`)
//   console.log(`👤 User permissions: http://localhost:${port}/api/auth/permissions`)
//   console.log("📋 ACL-Protected Routes:")
//   console.log("  GET  /api/admin/users - Admin only (users:read)")
//   console.log("  POST /api/admin/users - Admin only (users:create)")
//   console.log("  DELETE /api/admin/users/:id - Admin only (users:delete)")
//   console.log("  GET  /api/workstream - Read workstream (workstream:read)")
//   console.log("  POST /api/workstream - Create workstream (workstream:create)")
//   console.log("  GET  /api/dashboard/admin - Admin dashboard (dashboard:admin-view)")
//   console.log("  GET  /api/dashboard/viewer - Viewer dashboard (dashboard:viewer-view)")
//   console.log("📋 Workstream Routes:")
//   console.log("  GET  /api/open/workstream - Get workstream1 data")
//   console.log("  GET  /api/open/workstream/:workstreamId - Get specific workstream data")
//   console.log("  POST /api/open/workstream-list - Add new workstream")
//   console.log("  GET  /api/open/workstream-list - Get all workstreams")
//   console.log("📋 Dynamic Field Configuration:")
//   console.log("  GET  /api/admin/workstream/:workstreamId/field-config - Get field config")
//   console.log("  PUT  /api/admin/workstream/:workstreamId/field-config/:fieldName - Update field config")
//   console.log("  GET  /api/fields/:workstreamId - Get active fields")
// })





// const express = require("express")
// const cors = require("cors")
// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const { Pool } = require("pg")
// const multer = require("multer")
// const path = require("path")
// const fs = require("fs")
// const ACL = require("acl")
// require("dotenv").config()

// const app = express()
// const port = process.env.PORT || 5000

// // JWT Secret
// const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey123!@#"

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, "uploads")
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true })
// }

// // === Middleware ===
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   }),
// )
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads"))

// // === Multer File Upload Config ===
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
//     cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
//   },
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
//   fileFilter: (req, file, cb) => {
//     file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed!"), false)
//   },
// })

// // === PostgreSQL Connection ===
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "Workstream1",
//   password: "Ayansh@03",
//   port: 5432,
// })

// // === ACL Setup ===
// let acl
// const initializeACL = async () => {
//   try {
//     acl = new ACL(new ACL.memoryBackend())
//     await acl.allow([
//       {
//         roles: ["admin"],
//         allows: [
//           { resources: "users", permissions: ["create", "read", "update", "delete"] },
//           { resources: "workstream", permissions: ["create", "read", "update", "delete"] },
//           { resources: "dashboard", permissions: ["read", "admin-view"] },
//           { resources: "reports", permissions: ["create", "read", "update", "delete"] },
//           { resources: "settings", permissions: ["read", "update"] },
//         ],
//       },
//       {
//         roles: ["viewer"],
//         allows: [
//           { resources: "workstream", permissions: ["read"] },
//           { resources: "dashboard", permissions: ["read", "viewer-view"] },
//           { resources: "reports", permissions: ["read"] },
//           { resources: "profile", permissions: ["read", "update"] },
//         ],
//       },
//     ])
//     await acl.addRoleParents("admin", ["viewer"])
//     console.log("✅ ACL initialized successfully")
//   } catch (error) {
//     console.error("❌ ACL initialization error:", error)
//   }
// }
// initializeACL()

// // === Authentication Middleware ===
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"]
//   const token = authHeader && authHeader.split(" ")[1]
//   if (!token) {
//     return res.status(401).json({ message: "Access token required" })
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET)
//     const user = pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.userId])
//     if (user.rows.length === 0) {
//       return res.status(401).json({ message: "User not found" })
//     }
//     req.user = user.rows[0]
//     next()
//   } catch (error) {
//     console.error("Token verification error:", error)
//     return res.status(403).json({ message: "Invalid or expired token" })
//   }
// }

// // === ACL Authorization Middleware ===
// const checkPermission = (resource, permission) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       const hasPermission = await acl.isAllowed(userId, resource, permission)
//       if (!hasPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: { resource, permission },
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Helper function to check multiple permissions ===
// const checkAnyPermission = (permissions) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       let hasAnyPermission = false
//       for (const { resource, permission } of permissions) {
//         const allowed = await acl.isAllowed(userId, resource, permission)
//         if (allowed) {
//           hasAnyPermission = true
//           break
//         }
//       }
//       if (!hasAnyPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: permissions,
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL multiple permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Date handling functions ===
// const isValidDateString = (dateStr) => {
//   if (!dateStr || typeof dateStr !== "string") return false
//   const dateRegex = /^\d{4}-\d{2}-\d{2}$/
//   if (!dateRegex.test(dateStr)) return false
//   const [year, month, day] = dateStr.split("-").map(Number)
//   return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
// }

// const getFridayOfWeek = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     console.error("❌ Invalid date string:", dateStr)
//     return null
//   }
//   try {
//     const [year, month, day] = dateStr.split("-").map(Number)
//     let adjustedMonth = month
//     let adjustedYear = year
//     if (month < 3) {
//       adjustedMonth += 12
//       adjustedYear -= 1
//     }
//     const q = day
//     const m = adjustedMonth
//     const k = adjustedYear % 100
//     const j = Math.floor(adjustedYear / 100)
//     const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
//     const dayOfWeek = (h + 5) % 7
//     const daysToFriday = (4 - dayOfWeek + 7) % 7
//     let fridayDay = day + daysToFriday
//     let fridayMonth = month
//     let fridayYear = year
//     const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
//     if (fridayYear % 4 === 0 && (fridayYear % 100 !== 0 || fridayYear % 400 === 0)) {
//       daysInMonth[1] = 29
//     }
//     if (fridayDay > daysInMonth[fridayMonth - 1]) {
//       fridayDay = fridayDay - daysInMonth[fridayMonth - 1]
//       fridayMonth += 1
//       if (fridayMonth > 12) {
//         fridayMonth = 1
//         fridayYear += 1
//       }
//     }
//     const result = `${fridayYear}-${String(fridayMonth).padStart(2, "0")}-${String(fridayDay).padStart(2, "0")}`
//     return result
//   } catch (error) {
//     console.error("❌ Error calculating Friday:", error)
//     return null
//   }
// }

// const getMonthAndYear = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     return { month: null, year: null }
//   }
//   try {
//     const [year, month] = dateStr.split("-").map(Number)
//     const monthNames = [
//       "January",
//       "February",
//       "March",
//       "April",
//       "May",
//       "June",
//       "July",
//       "August",
//       "September",
//       "October",
//       "November",
//       "December",
//     ]
//     return {
//       month: monthNames[month - 1],
//       year: year,
//     }
//   } catch (error) {
//     console.error("❌ Error calculating month/year:", error)
//     return { month: null, year: null }
//   }
// }

// const ensureDateString = (dateValue) => {
//   if (!dateValue) return null
//   if (typeof dateValue === "string" && isValidDateString(dateValue)) {
//     return dateValue
//   }
//   if (dateValue instanceof Date) {
//     const year = dateValue.getFullYear()
//     const month = String(dateValue.getMonth() + 1).padStart(2, "0")
//     const day = String(dateValue.getDate()).padStart(2, "0")
//     return `${year}-${month}-${day}`
//   }
//   if (typeof dateValue === "string" && dateValue.includes("T")) {
//     const datePart = dateValue.split("T")[0]
//     if (isValidDateString(datePart)) {
//       return datePart
//     }
//   }
//   console.error("❌ Could not convert to date string:", dateValue)
//   return null
// }

// const safeJSONStringify = (data, fallback = "[]") => {
//   try {
//     if (data === null || data === undefined) {
//       return fallback
//     }
//     if (typeof data === "string") {
//       const parsed = JSON.parse(data)
//       return JSON.stringify(parsed)
//     }
//     return JSON.stringify(data)
//   } catch (error) {
//     console.error("❌ JSON stringify error:", error)
//     return fallback
//   }
// }

// // === ROUTES ===

// // User list
// app.get("/api/open/users", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({ success: true, users: result.rows })
//   } catch (err) {
//     console.error("Error fetching users:", err.message)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete user item
// app.post("/api/admin/delete-users", async (req, res) => {
//   const { ids } = req.body
//   if (!Array.isArray(ids) || ids.length === 0) {
//     return res.status(400).json({ message: "No user IDs provided" })
//   }
//   try {
//     const result = await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids])
//     res.status(200).json({ message: "Users deleted successfully", deleted: result.rowCount })
//   } catch (error) {
//     console.error("Delete error:", error)
//     res.status(500).json({ message: "Internal server error" })
//   }
// })

// // Workstream listing (Original workstream1 data)
// app.get("/api/open/workstream", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching open workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get specific workstream data by workstream ID (NEW ENDPOINT)
// app.get("/api/open/workstream/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // If it's workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query(`
//         SELECT 
//           wd.*,
//           ws.website_url
//         FROM workspace_data wd
//         LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//         ORDER BY wd.id DESC
//       `)

//       const formattedData = result.rows.map((row) => ({
//         ...row,
//         conditional_fields: row.conditional_fields
//           ? typeof row.conditional_fields === "string"
//             ? JSON.parse(row.conditional_fields)
//             : row.conditional_fields
//           : {},
//       }))

//       return res.json({
//         success: true,
//         data: formattedData,
//       })
//     }

//     // For workstream2, use the workstream2_data table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(`
//         SELECT * FROM workstream2_data 
//         ORDER BY created_at DESC
//       `)

//       return res.json({
//         success: true,
//         data: result.rows,
//       })
//     }

//     // For other dynamic workstreams, fetch data based on workstream_id
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.workstream_id = $1
//       ORDER BY wd.id DESC
//     `,
//       [workstreamId],
//     )

//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // For GET /api/open/workstream1
// app.get("/api/open/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({ success: true, data: formattedData })
//   } catch (err) {
//     console.error("Error fetching workstream1 data:", err)
//     res.status(500).json({ success: false, message: "Internal Server Error" })
//   }
// })

// // Delete workstream data by ID
// app.delete("/api/open/workstream/:id", async (req, res) => {
//   const { id } = req.params
//   try {
//     await pool.query("DELETE FROM workspace_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream record:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream data active for fields
// app.get("/api/fields/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//     res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.get("/api/admin/field-config", async (req, res) => {
//   const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//   res.json({ success: true, data: result.rows })
// })

// // === FIELD DEFINITIONS API (Missing endpoint) ===
// app.get("/api/admin/field-definitions", async (req, res) => {
//   try {
//     // This endpoint should return all available field definitions
//     // For now, we'll return a combined list from both workstream configs
//     const workstream1Fields = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//     const workstream2Fields = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")

//     // Format the response to match what the frontend expects
//     const allFields = [
//       ...workstream1Fields.rows.map((field) => ({
//         id: `ws1_${field.id}`,
//         field_name: field.field_name,
//         field_label: field.display_name || field.field_name,
//         field_type: field.field_type || "text",
//         is_required: field.is_required || false,
//         help_text: field.placeholder_text || "",
//         workstream: "workstream1",
//       })),
//       ...workstream2Fields.rows.map((field) => ({
//         id: `ws2_${field.id}`,
//         field_name: field.field_name,
//         field_label: field.display_name || field.field_name,
//         field_type: field.field_type || "text",
//         is_required: field.is_required || false,
//         help_text: field.placeholder_text || "",
//         workstream: "workstream2",
//       })),
//     ]

//     res.json({ success: true, data: allFields })
//   } catch (error) {
//     console.error("Error fetching field definitions:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.put("/api/admin/field-config/:fieldName", async (req, res) => {
//   const { fieldName } = req.params
//   const { is_active } = req.body
//   try {
//     await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [is_active, fieldName])
//     res.json({ success: true })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === DYNAMIC API ROUTES FOR WORKSTREAMS ===

// // Get all workstreams (for the workstreams page)
// app.get("/api/admin/workstreams", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get field configuration for a specific workstream (DYNAMIC)
// app.get("/api/admin/workstream/:workstreamId/field-config", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // For workstream1, use the existing field config table
//     if (workstreamId === "workstream1") {
//       const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//       return res.json({ success: true, data: result.rows })
//     }

//     // For workstream2, use the new dynamic field config table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")
//       return res.json({ success: true, data: result.rows })
//     }

//     // For other workstreams, return empty array for now
//     res.json({ success: true, data: [] })
//   } catch (error) {
//     console.error("Error fetching field config:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Update field configuration for a specific workstream (DYNAMIC)
// app.put("/api/admin/workstream/:workstreamId/field-config/:fieldName", async (req, res) => {
//   const { workstreamId, fieldName } = req.params
//   const { is_active } = req.body

//   try {
//     // For workstream1, update the existing table
//     if (workstreamId === "workstream1") {
//       await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [
//         is_active,
//         fieldName,
//       ])
//       return res.json({ success: true })
//     }

//     // For workstream2, update the new dynamic table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "UPDATE workstream2_field_config SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE field_name = $2 RETURNING *",
//         [is_active, fieldName],
//       )

//       if (result.rows.length === 0) {
//         return res.status(404).json({ success: false, message: "Field not found" })
//       }

//       return res.json({ success: true, data: result.rows[0] })
//     }

//     // For other workstreams, just return success
//     res.json({ success: true, message: `Field ${fieldName} updated for ${workstreamId}` })
//   } catch (err) {
//     console.error("Error updating field config:", err)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get active fields for a specific workstream (DYNAMIC)
// app.get("/api/fields/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // For workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//       return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//     }

//     // For workstream2, use the dynamic field config table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "SELECT field_name FROM workstream2_field_config WHERE is_active = TRUE ORDER BY field_order, id",
//       )
//       return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//     }

//     // For other workstreams, return empty array
//     res.json({ success: true, fields: [] })
//   } catch (err) {
//     console.error("Error fetching active fields:", err)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === DEBUG ENDPOINT - Check workstream2 field config ===
// app.get("/api/debug/workstream2-fields", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT COUNT(*) as count FROM workstream2_field_config")
//     const fields = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order LIMIT 5")

//     res.json({
//       success: true,
//       count: result.rows[0].count,
//       sample_fields: fields.rows,
//       message: `Found ${result.rows[0].count} fields in workstream2_field_config table`,
//     })
//   } catch (error) {
//     console.error("Error checking workstream2 fields:", error)
//     res.status(500).json({ success: false, message: error.message })
//   }
// })

// // === AUTHENTICATION ROUTES ===

// // Register Route
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     console.log("📝 Registration attempt for:", email, "Role:", role)
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       })
//     }
//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 6 characters long",
//       })
//     }
//     if (!["admin", "viewer"].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Role must be either 'admin' or 'viewer'",
//       })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email already exists",
//       })
//     }
//     const saltRounds = 10
//     const hashedPassword = await bcrypt.hash(password, saltRounds)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     const user = newUser.rows[0]
//     await acl.addUserRoles(user.id.toString(), role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Registration successful for:", email, "Role:", role)
//     res.json({
//       success: true,
//       message: "Registration successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         created_at: user.created_at,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Registration error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Login Route
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body
//     console.log("🔐 Login attempt for:", email)
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required",
//       })
//     }
//     const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
//     if (userResult.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     const user = userResult.rows[0]
//     const isValidPassword = await bcrypt.compare(password, user.password)
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     await acl.addUserRoles(user.id.toString(), user.role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Login successful for:", email, "Role:", user.role)
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Get user profile
// app.get("/api/auth/profile", authenticateToken, (req, res) => {
//   res.json({
//     success: true,
//     user: req.user,
//   })
// })

// // Workstreams API (Dynamic workstreams)
// app.post("/api/open/workstream-list", async (req, res) => {
//   const { name } = req.body
//   if (!name) return res.status(400).json({ success: false, message: "Name is required" })
//   try {
//     const result = await pool.query("INSERT INTO workstreams (name) VALUES ($1) RETURNING *", [name])
//     res.json({ success: true, data: result.rows[0] })
//   } catch (err) {
//     console.error("Error adding workstream:", err)
//     res.status(500).json({ success: false, message: "Failed to add workstream" })
//   }
// })

// app.get("/api/open/workstream-list", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get user permissions
// app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id.toString()
//     const userRoles = await acl.userRoles(userId)
//     const permissions = {}
//     const resources = ["users", "workstream", "dashboard", "reports", "settings", "profile"]
//     const permissionTypes = ["create", "read", "update", "delete", "admin-view", "viewer-view"]
//     for (const resource of resources) {
//       permissions[resource] = {}
//       for (const permission of permissionTypes) {
//         permissions[resource][permission] = await acl.isAllowed(userId, resource, permission)
//       }
//     }
//     res.json({
//       success: true,
//       user: req.user,
//       roles: userRoles,
//       permissions: permissions,
//     })
//   } catch (error) {
//     console.error("Error fetching permissions:", error)
//     res.status(500).json({ success: false, message: "Error fetching permissions" })
//   }
// })

// // === PROTECTED ROUTES WITH ACL ===

// // Admin only - Get all users
// app.get("/api/admin/users", authenticateToken, checkPermission("users", "read"), async (req, res) => {
//   try {
//     const users = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({
//       success: true,
//       users: users.rows,
//     })
//   } catch (error) {
//     console.error("Error fetching users:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Create user
// app.post("/api/admin/users", authenticateToken, checkPermission("users", "create"), async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     if (!name || !email || !password) {
//       return res.status(400).json({ success: false, message: "Name, email, and password are required" })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ success: false, message: "User already exists" })
//     }
//     const hashedPassword = await bcrypt.hash(password, 10)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     await acl.addUserRoles(newUser.rows[0].id.toString(), role)
//     res.json({
//       success: true,
//       message: "User created successfully",
//       user: newUser.rows[0],
//     })
//   } catch (error) {
//     console.error("Error creating user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Delete user
// app.delete("/api/admin/users/:id", authenticateToken, checkPermission("users", "delete"), async (req, res) => {
//   try {
//     const userId = req.params.id
//     await acl.removeUserRoles(userId, await acl.userRoles(userId))
//     const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])
//     if (result.rows.length === 0) {
//       return res.status(404).json({ success: false, message: "User not found" })
//     }
//     res.json({
//       success: true,
//       message: "User deleted successfully",
//     })
//   } catch (error) {
//     console.error("Error deleting user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream routes with ACL protection
// app.get("/api/workstream", authenticateToken, checkPermission("workstream", "read"), async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data ORDER BY id DESC")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === MAIN WORKSTREAM SUBMISSION ROUTE ===
// app.post("/api/workstream", upload.array("images", 10), async (req, res) => {
//   try {
//     const {
//       // ===== NEW FIELDS (From Reviewer Form) =====
//       fullName, // Maps to owner_name
//       registrationType, // Registration Type dropdown
//       reviewStatus, // Completed/Not Completed
//       reviewReason, // Reason when Not Completed
//       reviewType, // New Review/Re-Review
//       registrationPlatform, // Registration platform text
//       conditionalFields, // A1, A2, A3... fields
//       // ===== EXISTING FIELDS =====
//       accessibility,
//       third_party_content,
//       conditional_response,
//       website_type,
//       registration_site,
//       comments,
//       website_operator,
//       owner_name, // Keep this for backward compatibility
//       review_date,
//       calculated_friday,
//       review_month,
//       review_year,
//       review_traffic,
//       website_source_id,
//       website_url,
//       aChecks,
//     } = req.body

//     console.log("📝 Form submission received:")
//     console.log("New fields:", {
//       fullName,
//       registrationType,
//       reviewStatus,
//       reviewReason,
//       reviewType,
//       registrationPlatform,
//     })
//     console.log("🔧 Conditional fields received:", conditionalFields)
//     console.log("Existing fields:", { accessibility, third_party_content, website_url, owner_name })

//     // Handle website source ID
//     let finalWebsiteSourceId = website_source_id
//     if (!website_source_id && website_url) {
//       try {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       } catch (urlError) {
//         console.error("❌ Error handling website URL:", urlError)
//         throw new Error(`Website URL error: ${urlError.message}`)
//       }
//     }

//     const finalReviewDate = ensureDateString(review_date)
//     const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//     const { month, year } = getMonthAndYear(finalReviewDate)
//     const finalReviewMonth = review_month || month
//     const finalReviewYear = review_year || year

//     // Process images
//     let imageData = []
//     if (req.files && req.files.length > 0) {
//       imageData = req.files.map((file) => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         size: file.size,
//         mimetype: file.mimetype,
//         url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//       }))
//     }

//     // Parse aChecks
//     let parsedAChecks = []
//     if (aChecks) {
//       try {
//         parsedAChecks = typeof aChecks === "string" ? JSON.parse(aChecks) : aChecks
//       } catch (parseError) {
//         console.error("❌ Error parsing aChecks:", parseError)
//         parsedAChecks = []
//       }
//     }

//     // Parse conditional fields - FIXED
//     let parsedConditionalFields = {}
//     if (conditionalFields) {
//       try {
//         parsedConditionalFields =
//           typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//         console.log("✅ Parsed conditional fields:", parsedConditionalFields)
//       } catch (parseError) {
//         console.error("❌ Error parsing conditionalFields:", parseError)
//         parsedConditionalFields = {}
//       }
//     }

//     const imagesJSON = safeJSONStringify(imageData, "[]")
//     const aChecksJSON = safeJSONStringify(parsedAChecks, "[]")
//     const conditionalFieldsJSON = safeJSONStringify(parsedConditionalFields, "{}")

//     console.log("💾 Final conditional fields JSON:", conditionalFieldsJSON)

//     // Use fullName if provided, otherwise use owner_name
//     const finalOwnerName = fullName || owner_name

//     const insertQuery = `
//       INSERT INTO workspace_data (
//         registration_type, review_status, review_reason, review_type,
//         registration_platform, conditional_fields,
//         accessibility, third_party_content, conditional_response, website_type,
//         registration_site, comments, website_operator, owner_name, 
//         review_date, calculated_friday, review_month, review_year,
//         review_traffic, images, a_checks, website_source_id
//       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19, $20, $21, $22)
//       RETURNING id, review_date, calculated_friday, conditional_fields
//     `

//     const insertValues = [
//       // New fields
//       registrationType || null,
//       reviewStatus || null,
//       reviewReason || null,
//       reviewType || null,
//       registrationPlatform || null,
//       conditionalFieldsJSON, // This will be cast to JSONB
//       // Existing fields
//       accessibility || null,
//       third_party_content || null,
//       conditional_response || null,
//       website_type || null,
//       registration_site || null,
//       comments || null,
//       website_operator || null,
//       finalOwnerName || null,
//       finalReviewDate,
//       finalCalculatedFriday,
//       finalReviewMonth,
//       finalReviewYear,
//       review_traffic || null,
//       imagesJSON,
//       aChecksJSON,
//       finalWebsiteSourceId || null,
//     ]

//     console.log("💾 Inserting data with conditional fields:", conditionalFieldsJSON)

//     const result = await pool.query(insertQuery, insertValues)

//     console.log("✅ Form submitted successfully with ID:", result.rows[0].id)
//     console.log("✅ Stored conditional fields:", result.rows[0].conditional_fields)

//     res.status(200).json({
//       message: "Reviewer form submitted successfully!",
//       id: result.rows[0].id,
//       images: imageData,
//       website_source_id: finalWebsiteSourceId,
//       stored_review_date: ensureDateString(result.rows[0].review_date),
//       stored_calculated_friday: ensureDateString(result.rows[0].calculated_friday),
//       calculated_friday: finalCalculatedFriday,
//       review_month: finalReviewMonth,
//       review_year: finalReviewYear,
//       conditional_fields: result.rows[0].conditional_fields,
//     })
//   } catch (error) {
//     console.error("💥 === FORM SUBMISSION ERROR ===")
//     console.error("Error:", error)
//     if (req.files) {
//       req.files.forEach((file) => {
//         fs.unlink(file.path, (err) => {
//           if (err) console.error("Error deleting file:", err)
//         })
//       })
//     }
//     res.status(500).json({
//       error: "Failed to submit workstream data",
//       message: error.message,
//     })
//   }
// })

// // workstream2 - Get all workstream2 data
// app.get("/api/workstream2", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT * FROM workstream2_data 
//       ORDER BY created_at DESC
//     `)
//     res.json({ success: true, data: result.rows })
//   } catch (error) {
//     console.error("Error fetching workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Add new workstream2 record
// app.post("/api/workstream2", async (req, res) => {
//   try {
//     const {
//       case_no,
//       test_successful,
//       card_no,
//       card_country,
//       expiry_date,
//       cvv,
//       email,
//       tested_url_homepage,
//       tested_url,
//       tested_on_date,
//       tested_amount,
//       tested_currency,
//       billing_address_if_asked,
//       billing_phone_number,
//       billing_name,
//       declined_message,
//       not_tested_breakup,
//       comments,
//       id_verification_required,
//       bypass_id_verification,
//       violation,
//       tested_product,
//       merchant_name_bill,
//       log_generated,
//       transaction_gmt_date,
//       account_number_masked,
//       acquiring_identifier,
//       acquiring_user_bid,
//       acquirer_name,
//       acquiring_identifier_region,
//       acquirer_region,
//       acquiring_identifier_legal_country,
//       acquirer_country,
//       merchant_name_acceptor,
//       merchant_city,
//       merchant_state_code,
//       merchant_state,
//       merchant_country_code,
//       merchant_country,
//       merchant_category_code,
//       enriched_merchant_category,
//       card_acceptor_id,
//       card_acceptor_terminal_id,
//       pos_entry_mode,
//       enriched_pos_entry_mode,
//       pos_condition_code,
//       pos_condition,
//       transaction_identifier,
//       transaction_currency_code,
//       eci_moto_group_code,
//       metrics,
//       auth_transaction_count,
//       transaction_amount_usd,
//       auth_transaction_amount,
//     } = req.body

//     const result = await pool.query(
//       `
//       INSERT INTO workstream2_data (
//         case_no, test_successful, card_no, card_country, expiry_date, cvv, email,
//         tested_url_homepage, tested_url, tested_on_date, tested_amount, tested_currency,
//         billing_address_if_asked, billing_phone_number, billing_name, declined_message,
//         not_tested_breakup, comments, id_verification_required, bypass_id_verification,
//         violation, tested_product, merchant_name_bill, log_generated, transaction_gmt_date,
//         account_number_masked, acquiring_identifier, acquiring_user_bid, acquirer_name,
//         acquiring_identifier_region, acquirer_region, acquiring_identifier_legal_country,
//         acquirer_country, merchant_name_acceptor, merchant_city, merchant_state_code,
//         merchant_state, merchant_country_code, merchant_country, merchant_category_code,
//         enriched_merchant_category, card_acceptor_id, card_acceptor_terminal_id,
//         pos_entry_mode, enriched_pos_entry_mode, pos_condition_code, pos_condition,
//         transaction_identifier, transaction_currency_code, eci_moto_group_code,
//         metrics, auth_transaction_count, transaction_amount_usd, auth_transaction_amount
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
//         $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
//         $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
//         $51, $52, $53
//       ) RETURNING *
//     `,
//       [
//         case_no,
//         test_successful,
//         card_no,
//         card_country,
//         expiry_date,
//         cvv,
//         email,
//         tested_url_homepage,
//         tested_url,
//         tested_on_date,
//         tested_amount,
//         tested_currency,
//         billing_address_if_asked,
//         billing_phone_number,
//         billing_name,
//         declined_message,
//         not_tested_breakup,
//         comments,
//         id_verification_required,
//         bypass_id_verification,
//         violation,
//         tested_product,
//         merchant_name_bill,
//         log_generated,
//         transaction_gmt_date,
//         account_number_masked,
//         acquiring_identifier,
//         acquiring_user_bid,
//         acquirer_name,
//         acquiring_identifier_region,
//         acquirer_region,
//         acquiring_identifier_legal_country,
//         acquirer_country,
//         merchant_name_acceptor,
//         merchant_city,
//         merchant_state_code,
//         merchant_state,
//         merchant_country_code,
//         merchant_country,
//         merchant_category_code,
//         enriched_merchant_category,
//         card_acceptor_id,
//         card_acceptor_terminal_id,
//         pos_entry_mode,
//         enriched_pos_entry_mode,
//         pos_condition_code,
//         pos_condition,
//         transaction_identifier,
//         transaction_currency_code,
//         eci_moto_group_code,
//         metrics,
//         auth_transaction_count,
//         transaction_amount_usd,
//         auth_transaction_amount,
//       ],
//     )

//     res.json({ success: true, data: result.rows[0] })
//   } catch (error) {
//     console.error("Error adding workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete workstream2 record
// app.delete("/api/workstream2/:id", async (req, res) => {
//   try {
//     const { id } = req.params
//     await pool.query("DELETE FROM workstream2_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Dashboard routes with different permissions
// app.get("/api/dashboard/admin", authenticateToken, checkPermission("dashboard", "admin-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Admin dashboard data",
//     data: {
//       totalUsers: 100,
//       totalWorkstreams: 50,
//       systemHealth: "Good",
//     },
//   })
// })

// app.get("/api/dashboard/viewer", authenticateToken, checkPermission("dashboard", "viewer-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Viewer dashboard data",
//     data: {
//       myWorkstreams: 5,
//       recentActivity: [],
//     },
//   })
// })

// // Route that requires multiple permissions
// app.get(
//   "/api/workstream/:id/sensitive",
//   authenticateToken,
//   checkAnyPermission([
//     { resource: "workstream", permission: "delete" },
//     { resource: "users", permission: "read" },
//   ]),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: "Sensitive workstream data",
//       data: { id: req.params.id },
//     })
//   },
// )

// // Test route
// app.get("/api/auth/test", (req, res) => {
//   res.json({
//     message: "🎉 ACL-powered auth system working!",
//     timestamp: new Date().toISOString(),
//   })
// })

// // === Auto-suggest URL APIs ===
// app.get("/api/website-sources", async (req, res) => {
//   const { search } = req.query
//   if (!search) return res.json([])
//   try {
//     const result = await pool.query("SELECT id, website_url FROM website_sources WHERE website_url ILIKE $1 LIMIT 10", [
//       `%${search}%`,
//     ])
//     res.json(result.rows)
//   } catch (error) {
//     console.error("❌ /api/website-sources error:", error.message)
//     res.status(500).json({ error: error.message })
//   }
// })

// // === Get All Workstream Entries ===
// app.get("/api/workspace_data", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       review_date: ensureDateString(row.review_date),
//       calculated_friday: ensureDateString(row.calculated_friday),
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json(formattedData)
//   } catch (err) {
//     console.error("❌ Error fetching all workspace data:", err)
//     res.status(500).json({ message: "Server Error", error: err.message })
//   }
// })

// // === Get Single Workstream Entry by ID ===
// app.get("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.id = $1
//     `,
//       [id],
//     )
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = result.rows[0]
//     const formattedRecord = {
//       ...record,
//       review_date: ensureDateString(record.review_date),
//       calculated_friday: ensureDateString(record.calculated_friday),
//       conditional_fields: record.conditional_fields
//         ? typeof record.conditional_fields === "string"
//           ? JSON.parse(record.conditional_fields)
//           : record.conditional_fields
//         : {},
//     }
//     res.json(formattedRecord)
//   } catch (err) {
//     console.error("❌ Error fetching workspace_data by ID:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Update Workstream Entry by ID ===
// app.put(
//   "/api/workspace_data/:id",
//   (req, res, next) => {
//     const contentType = req.get("Content-Type") || ""
//     if (contentType.includes("multipart/form-data")) {
//       upload.array("images", 10)(req, res, next)
//     } else {
//       next()
//     }
//   },
//   async (req, res) => {
//     const id = req.params.id
//     console.log("🔄 Updating record ID:", id)
//     try {
//       let formData
//       let newImageFiles = []
//       let existingImages = []
//       const contentType = req.get("Content-Type") || ""
//       if (contentType.includes("multipart/form-data")) {
//         formData = req.body
//         if (req.files && req.files.length > 0) {
//           newImageFiles = req.files.map((file) => ({
//             filename: file.filename,
//             originalname: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype,
//             url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//           }))
//         }
//         if (formData.existing_images) {
//           try {
//             existingImages = JSON.parse(formData.existing_images)
//           } catch (e) {
//             console.error("Error parsing existing images:", e)
//             existingImages = []
//           }
//         }
//       } else {
//         formData = req.body
//         if (formData.images) {
//           try {
//             existingImages = typeof formData.images === "string" ? JSON.parse(formData.images) : formData.images
//           } catch (e) {
//             console.error("Error parsing images:", e)
//             existingImages = []
//           }
//         }
//       }

//       const {
//         // New fields
//         fullName,
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         conditionalFields,
//         // Existing fields
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         owner_name,
//         review_date,
//         calculated_friday,
//         review_month,
//         review_year,
//         review_traffic,
//         website_source_id,
//         website_url,
//         aChecks,
//       } = formData

//       let finalWebsiteSourceId = website_source_id
//       if (website_url && (!website_source_id || website_source_id === "")) {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       }

//       const finalReviewDate = ensureDateString(review_date)
//       const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//       const { month, year } = getMonthAndYear(finalReviewDate)
//       const finalReviewMonth = review_month || month
//       const finalReviewYear = review_year || year

//       const allImages = [...existingImages, ...newImageFiles]
//       const imagesJSON = safeJSONStringify(allImages, "[]")

//       // Parse conditional fields - FIXED
//       let parsedConditionalFields = {}
//       if (conditionalFields) {
//         try {
//           parsedConditionalFields =
//             typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//           console.log("🔄 Update - Parsed conditional fields:", parsedConditionalFields)
//         } catch (e) {
//           console.error("Error parsing conditionalFields:", e)
//         }
//       }

//       const finalOwnerName = fullName || owner_name

//       const updateQuery = `
//       UPDATE workspace_data SET 
//         registration_type = $1, review_status = $2, review_reason = $3, review_type = $4,
//         registration_platform = $5, conditional_fields = $6::jsonb,
//         accessibility = $7, third_party_content = $8, conditional_response = $9, website_type = $10,
//         registration_site = $11, comments = $12, website_operator = $13, owner_name = $14,
//         review_date = $15::date, calculated_friday = $16::date, review_month = $17, review_year = $18,
//         review_traffic = $19, website_source_id = $20, a_checks = $21, images = $22
//       WHERE id = $23
//       RETURNING *
//     `

//       const updateValues = [
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         safeJSONStringify(parsedConditionalFields, "{}"), // Cast to JSONB
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         finalOwnerName,
//         finalReviewDate,
//         finalCalculatedFriday,
//         finalReviewMonth,
//         finalReviewYear,
//         review_traffic,
//         finalWebsiteSourceId,
//         aChecks || null,
//         imagesJSON,
//         id,
//       ]

//       const result = await pool.query(updateQuery, updateValues)

//       if (result.rows.length === 0) {
//         return res.status(404).json({ message: "Record not found" })
//       }

//       const updatedRecord = await pool.query(
//         `SELECT wd.*, ws.website_url FROM workspace_data wd
//        LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//        WHERE wd.id = $1`,
//         [id],
//       )

//       const formattedUpdatedRecord = {
//         ...updatedRecord.rows[0],
//         review_date: ensureDateString(updatedRecord.rows[0].review_date),
//         calculated_friday: ensureDateString(updatedRecord.rows[0].calculated_friday),
//         conditional_fields: updatedRecord.rows[0].conditional_fields
//           ? typeof updatedRecord.rows[0].conditional_fields === "string"
//             ? JSON.parse(updatedRecord.rows[0].conditional_fields)
//             : updatedRecord.rows[0].conditional_fields
//           : {},
//       }

//       console.log("✅ Update successful")
//       res.json({
//         message: "Record updated successfully",
//         data: formattedUpdatedRecord,
//       })
//     } catch (err) {
//       console.error("❌ Error updating workspace_data:", err)
//       if (req.files) {
//         req.files.forEach((file) => {
//           fs.unlink(file.path, (err) => {
//             if (err) console.error("Error deleting file:", err)
//           })
//         })
//       }
//       res.status(500).json({ message: "Server error", error: err.message })
//     }
//   },
// )

// // === Delete Workstream Entry by ID ===
// app.delete("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const existingRecord = await pool.query("SELECT images FROM workspace_data WHERE id = $1", [id])
//     if (existingRecord.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = existingRecord.rows[0]
//     if (record.images) {
//       try {
//         const images = typeof record.images === "string" ? JSON.parse(record.images) : record.images
//         if (Array.isArray(images)) {
//           images.forEach((image) => {
//             if (image.filename) {
//               const filePath = path.join(__dirname, "uploads", image.filename)
//               fs.unlink(filePath, (err) => {
//                 if (err) console.error("❌ Error deleting image file:", err)
//               })
//             }
//           })
//         }
//       } catch (parseError) {
//         console.error("❌ Error parsing images for cleanup:", parseError)
//       }
//     }
//     const deleteResult = await pool.query("DELETE FROM workspace_data WHERE id = $1 RETURNING id", [id])
//     if (deleteResult.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     res.json({ message: "Record deleted successfully", deletedId: id })
//   } catch (err) {
//     console.error("❌ Error deleting workspace_data:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Error handling ===
// app.use((error, req, res, next) => {
//   console.error("❌ Unhandled error:", error)
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//   })
// })

// // === 404 handler ===
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.method} ${req.originalUrl} not found`,
//   })
// })

// // Start server
// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`)
//   console.log(`🔐 Auth test: http://localhost:${port}/api/auth/test`)
//   console.log(`👤 User permissions: http://localhost:${port}/api/auth/permissions`)
//   console.log("📋 ACL-Protected Routes:")
//   console.log("  GET  /api/admin/users - Admin only (users:read)")
//   console.log("  POST /api/admin/users - Admin only (users:create)")
//   console.log("  DELETE /api/admin/users/:id - Admin only (users:delete)")
//   console.log("  GET  /api/workstream - Read workstream (workstream:read)")
//   console.log("  POST /api/workstream - Create workstream (workstream:create)")
//   console.log("  GET  /api/dashboard/admin - Admin dashboard (dashboard:admin-view)")
//   console.log("  GET  /api/dashboard/viewer - Viewer dashboard (dashboard:viewer-view)")
//   console.log("📋 Workstream Routes:")
//   console.log("  GET  /api/open/workstream - Get workstream1 data")
//   console.log("  GET  /api/open/workstream/:workstreamId - Get specific workstream data")
//   console.log("  POST /api/open/workstream-list - Add new workstream")
//   console.log("  GET  /api/open/workstream-list - Get all workstreams")
//   console.log("📋 Dynamic Field Configuration:")
//   console.log("  GET  /api/admin/workstream/:workstreamId/field-config - Get field config")
//   console.log("  PUT  /api/admin/workstream/:workstreamId/field-config/:fieldName - Update field config")
//   console.log("  GET  /api/fields/:workstreamId - Get active fields")
// })



// const express = require("express")
// const cors = require("cors")
// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const { Pool } = require("pg")
// const multer = require("multer")
// const path = require("path")
// const fs = require("fs")
// const ACL = require("acl")
// require("dotenv").config()

// const app = express()
// const port = process.env.PORT || 5000

// // JWT Secret
// const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey123!@#"

// // Create uploads directory if it doesn't exist
// const uploadsDir = path.join(__dirname, "uploads")
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true })
// }

// // === Middleware ===
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   }),
// )
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads"))

// // === Multer File Upload Config ===
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
//     cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
//   },
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
//   fileFilter: (req, file, cb) => {
//     file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed!"), false)
//   },
// })

// // === PostgreSQL Connection ===
// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "Workstream1",
//   password: "Ayansh@03",
//   port: 5432,
// })

// // === ACL Setup ===
// let acl
// const initializeACL = async () => {
//   try {
//     acl = new ACL(new ACL.memoryBackend())
//     await acl.allow([
//       {
//         roles: ["admin"],
//         allows: [
//           { resources: "users", permissions: ["create", "read", "update", "delete"] },
//           { resources: "workstream", permissions: ["create", "read", "update", "delete"] },
//           { resources: "dashboard", permissions: ["read", "admin-view"] },
//           { resources: "reports", permissions: ["create", "read", "update", "delete"] },
//           { resources: "settings", permissions: ["read", "update"] },
//         ],
//       },
//       {
//         roles: ["viewer"],
//         allows: [
//           { resources: "workstream", permissions: ["read"] },
//           { resources: "dashboard", permissions: ["read", "viewer-view"] },
//           { resources: "reports", permissions: ["read"] },
//           { resources: "profile", permissions: ["read", "update"] },
//         ],
//       },
//     ])
//     await acl.addRoleParents("admin", ["viewer"])
//     console.log("✅ ACL initialized successfully")
//   } catch (error) {
//     console.error("❌ ACL initialization error:", error)
//   }
// }
// initializeACL()

// // === Authentication Middleware ===
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"]
//   const token = authHeader && authHeader.split(" ")[1]
//   if (!token) {
//     return res.status(401).json({ message: "Access token required" })
//   }
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET)
//     const user = pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.userId])
//     if (user.rows.length === 0) {
//       return res.status(401).json({ message: "User not found" })
//     }
//     req.user = user.rows[0]
//     next()
//   } catch (error) {
//     console.error("Token verification error:", error)
//     return res.status(403).json({ message: "Invalid or expired token" })
//   }
// }

// // === ACL Authorization Middleware ===
// const checkPermission = (resource, permission) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       const hasPermission = await acl.isAllowed(userId, resource, permission)
//       if (!hasPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: { resource, permission },
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Helper function to check multiple permissions ===
// const checkAnyPermission = (permissions) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ message: "Authentication required" })
//       }
//       const userId = req.user.id.toString()
//       const userRole = req.user.role
//       await acl.addUserRoles(userId, userRole)
//       let hasAnyPermission = false
//       for (const { resource, permission } of permissions) {
//         const allowed = await acl.isAllowed(userId, resource, permission)
//         if (allowed) {
//           hasAnyPermission = true
//           break
//         }
//       }
//       if (!hasAnyPermission) {
//         return res.status(403).json({
//           message: "Access denied",
//           required: permissions,
//           userRole: userRole,
//         })
//       }
//       next()
//     } catch (error) {
//       console.error("ACL multiple permission check error:", error)
//       return res.status(500).json({ message: "Permission check failed" })
//     }
//   }
// }

// // === Date handling functions ===
// const isValidDateString = (dateStr) => {
//   if (!dateStr || typeof dateStr !== "string") return false
//   const dateRegex = /^\d{4}-\d{2}-\d{2}$/
//   if (!dateRegex.test(dateStr)) return false
//   const [year, month, day] = dateStr.split("-").map(Number)
//   return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
// }

// const getFridayOfWeek = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     console.error("❌ Invalid date string:", dateStr)
//     return null
//   }
//   try {
//     const [year, month, day] = dateStr.split("-").map(Number)
//     let adjustedMonth = month
//     let adjustedYear = year
//     if (month < 3) {
//       adjustedMonth += 12
//       adjustedYear -= 1
//     }
//     const q = day
//     const m = adjustedMonth
//     const k = adjustedYear % 100
//     const j = Math.floor(adjustedYear / 100)
//     const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
//     const dayOfWeek = (h + 5) % 7
//     const daysToFriday = (4 - dayOfWeek + 7) % 7
//     let fridayDay = day + daysToFriday
//     let fridayMonth = month
//     let fridayYear = year
//     const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
//     if (fridayYear % 4 === 0 && (fridayYear % 100 !== 0 || fridayYear % 400 === 0)) {
//       daysInMonth[1] = 29
//     }
//     if (fridayDay > daysInMonth[fridayMonth - 1]) {
//       fridayDay = fridayDay - daysInMonth[fridayMonth - 1]
//       fridayMonth += 1
//       if (fridayMonth > 12) {
//         fridayMonth = 1
//         fridayYear += 1
//       }
//     }
//     const result = `${fridayYear}-${String(fridayMonth).padStart(2, "0")}-${String(fridayDay).padStart(2, "0")}`
//     return result
//   } catch (error) {
//     console.error("❌ Error calculating Friday:", error)
//     return null
//   }
// }

// const getMonthAndYear = (dateStr) => {
//   if (!isValidDateString(dateStr)) {
//     return { month: null, year: null }
//   }
//   try {
//     const [year, month] = dateStr.split("-").map(Number)
//     const monthNames = [
//       "January",
//       "February",
//       "March",
//       "April",
//       "May",
//       "June",
//       "July",
//       "August",
//       "September",
//       "October",
//       "November",
//       "December",
//     ]
//     return {
//       month: monthNames[month - 1],
//       year: year,
//     }
//   } catch (error) {
//     console.error("❌ Error calculating month/year:", error)
//     return { month: null, year: null }
//   }
// }

// const ensureDateString = (dateValue) => {
//   if (!dateValue) return null
//   if (typeof dateValue === "string" && isValidDateString(dateValue)) {
//     return dateValue
//   }
//   if (dateValue instanceof Date) {
//     const year = dateValue.getFullYear()
//     const month = String(dateValue.getMonth() + 1).padStart(2, "0")
//     const day = String(dateValue.getDate()).padStart(2, "0")
//     return `${year}-${month}-${day}`
//   }
//   if (typeof dateValue === "string" && dateValue.includes("T")) {
//     const datePart = dateValue.split("T")[0]
//     if (isValidDateString(datePart)) {
//       return datePart
//     }
//   }
//   console.error("❌ Could not convert to date string:", dateValue)
//   return null
// }

// const safeJSONStringify = (data, fallback = "[]") => {
//   try {
//     if (data === null || data === undefined) {
//       return fallback
//     }
//     if (typeof data === "string") {
//       const parsed = JSON.parse(data)
//       return JSON.stringify(parsed)
//     }
//     return JSON.stringify(data)
//   } catch (error) {
//     console.error("❌ JSON stringify error:", error)
//     return fallback
//   }
// }

// // === ROUTES ===

// // User list
// app.get("/api/open/users", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({ success: true, users: result.rows })
//   } catch (err) {
//     console.error("Error fetching users:", err.message)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete user item
// app.post("/api/admin/delete-users", async (req, res) => {
//   const { ids } = req.body
//   if (!Array.isArray(ids) || ids.length === 0) {
//     return res.status(400).json({ message: "No user IDs provided" })
//   }
//   try {
//     const result = await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids])
//     res.status(200).json({ message: "Users deleted successfully", deleted: result.rowCount })
//   } catch (error) {
//     console.error("Delete error:", error)
//     res.status(500).json({ message: "Internal server error" })
//   }
// })

// // Workstream listing (Original workstream1 data)
// app.get("/api/open/workstream", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching open workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get specific workstream data by workstream ID (NEW ENDPOINT)
// app.get("/api/open/workstream/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // If it's workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query(`
//         SELECT 
//           wd.*,
//           ws.website_url
//         FROM workspace_data wd
//         LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//         ORDER BY wd.id DESC
//       `)

//       const formattedData = result.rows.map((row) => ({
//         ...row,
//         conditional_fields: row.conditional_fields
//           ? typeof row.conditional_fields === "string"
//             ? JSON.parse(row.conditional_fields)
//             : row.conditional_fields
//           : {},
//       }))

//       return res.json({
//         success: true,
//         data: formattedData,
//       })
//     }

//     // For workstream2, use the workstream2_data table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(`
//         SELECT * FROM workstream2_data 
//         ORDER BY created_at DESC
//       `)

//       return res.json({
//         success: true,
//         data: result.rows,
//       })
//     }

//     // For other dynamic workstreams, fetch data based on workstream_id
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.workstream_id = $1
//       ORDER BY wd.id DESC
//     `,
//       [workstreamId],
//     )

//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))

//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // For GET /api/open/workstream1
// app.get("/api/open/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({ success: true, data: formattedData })
//   } catch (err) {
//     console.error("Error fetching workstream1 data:", err)
//     res.status(500).json({ success: false, message: "Internal Server Error" })
//   }
// })

// // Delete workstream data by ID
// app.delete("/api/open/workstream/:id", async (req, res) => {
//   const { id } = req.params
//   try {
//     await pool.query("DELETE FROM workspace_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream record:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream data active for fields
// app.get("/api/fields/workstream1", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//     res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.get("/api/admin/field-config", async (req, res) => {
//   const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//   res.json({ success: true, data: result.rows })
// })

// // === FIELD DEFINITIONS API (Missing endpoint) ===
// app.get("/api/admin/field-definitions", async (req, res) => {
//   try {
//     // This endpoint should return all available field definitions
//     // For now, we'll return a combined list from both workstream configs
//     const workstream1Fields = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//     const workstream2Fields = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")

//     // Format the response to match what the frontend expects
//     const allFields = [
//       ...workstream1Fields.rows.map((field) => ({
//         id: `ws1_${field.id}`,
//         field_name: field.field_name,
//         field_label: field.display_name || field.field_name,
//         field_type: field.field_type || "text",
//         is_required: field.is_required || false,
//         help_text: field.placeholder_text || "",
//         workstream: "workstream1",
//       })),
//       ...workstream2Fields.rows.map((field) => ({
//         id: `ws2_${field.id}`,
//         field_name: field.field_name,
//         field_label: field.display_name || field.field_name,
//         field_type: field.field_type || "text",
//         is_required: field.is_required || false,
//         help_text: field.placeholder_text || "",
//         workstream: "workstream2",
//       })),
//     ]

//     res.json({ success: true, data: allFields })
//   } catch (error) {
//     console.error("Error fetching field definitions:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// app.put("/api/admin/field-config/:fieldName", async (req, res) => {
//   const { fieldName } = req.params
//   const { is_active } = req.body
//   try {
//     await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [is_active, fieldName])
//     res.json({ success: true })
//   } catch (err) {
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === DYNAMIC API ROUTES FOR WORKSTREAMS ===

// // Get all workstreams (for the workstreams page)
// app.get("/api/admin/workstreams", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get field configuration for a specific workstream (DYNAMIC)
// app.get("/api/admin/workstream/:workstreamId/field-config", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     console.log(`🔍 Fetching field config for: ${workstreamId}`)

//     // For workstream1, use the existing field config table
//     if (workstreamId === "workstream1") {
//       const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
//       console.log(`✅ Found ${result.rows.length} fields for workstream1`)
//       return res.json({ success: true, data: result.rows })
//     }

//     // For workstream2, use the new dynamic field config table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")
//       console.log(`✅ Found ${result.rows.length} fields for workstream2`)
//       return res.json({ success: true, data: result.rows })
//     }

//     // For other workstreams, return empty array for now
//     console.log(`⚠️ No field config found for: ${workstreamId}`)
//     res.json({ success: true, data: [] })
//   } catch (error) {
//     console.error("Error fetching field config:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === FIELD TOGGLE ENDPOINT (FIXED) ===
// app.put("/api/admin/workstream/:workstreamId/field-config/toggle", async (req, res) => {
//   const { workstreamId } = req.params
//   const { fieldName, is_active } = req.body

//   console.log(`🔄 Toggle request for ${workstreamId}:`, { fieldName, is_active })

//   if (!fieldName) {
//     return res.status(400).json({ success: false, message: "fieldName is required" })
//   }

//   try {
//     // For workstream1, update the existing table
//     if (workstreamId === "workstream1") {
//       const result = await pool.query(
//         "UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2 RETURNING *",
//         [is_active, fieldName],
//       )

//       if (result.rows.length === 0) {
//         console.log(`❌ Field not found in workstream1: ${fieldName}`)
//         return res.status(404).json({ success: false, message: "Field not found" })
//       }

//       console.log(`✅ Updated workstream1 field: ${fieldName} to ${is_active}`)
//       return res.json({ success: true, data: result.rows[0] })
//     }

//     // For workstream2, update the new dynamic table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "UPDATE workstream2_field_config SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE field_name = $2 RETURNING *",
//         [is_active, fieldName],
//       )

//       if (result.rows.length === 0) {
//         console.log(`❌ Field not found in workstream2: ${fieldName}`)
//         return res.status(404).json({ success: false, message: "Field not found" })
//       }

//       console.log(`✅ Updated workstream2 field: ${fieldName} to ${is_active}`)
//       return res.json({ success: true, data: result.rows[0] })
//     }

//     // For other workstreams, just return success
//     res.json({ success: true, message: `Field ${fieldName} updated for ${workstreamId}` })
//   } catch (err) {
//     console.error("❌ Error toggling field:", err)
//     res.status(500).json({ success: false, message: "Server error", error: err.message })
//   }
// })

// // Update field configuration for a specific workstream (DYNAMIC)
// app.put("/api/admin/workstream/:workstreamId/field-config/:fieldName", async (req, res) => {
//   const { workstreamId, fieldName } = req.params
//   const { is_active } = req.body

//   try {
//     // For workstream1, update the existing table
//     if (workstreamId === "workstream1") {
//       await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [
//         is_active,
//         fieldName,
//       ])
//       return res.json({ success: true })
//     }

//     // For workstream2, update the new dynamic table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "UPDATE workstream2_field_config SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE field_name = $2 RETURNING *",
//         [is_active, fieldName],
//       )

//       if (result.rows.length === 0) {
//         return res.status(404).json({ success: false, message: "Field not found" })
//       }

//       return res.json({ success: true, data: result.rows[0] })
//     }

//     // For other workstreams, just return success
//     res.json({ success: true, message: `Field ${fieldName} updated for ${workstreamId}` })
//   } catch (err) {
//     console.error("Error updating field config:", err)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Get active fields for a specific workstream (DYNAMIC)
// app.get("/api/fields/:workstreamId", async (req, res) => {
//   const { workstreamId } = req.params

//   try {
//     // For workstream1, use the existing logic
//     if (workstreamId === "workstream1") {
//       const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
//       return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//     }

//     // For workstream2, use the dynamic field config table
//     if (workstreamId === "workstream2") {
//       const result = await pool.query(
//         "SELECT field_name FROM workstream2_field_config WHERE is_active = TRUE ORDER BY field_order, id",
//       )
//       return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
//     }

//     // For other workstreams, return empty array
//     res.json({ success: true, fields: [] })
//   } catch (err) {
//     console.error("Error fetching active fields:", err)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === DEBUG ENDPOINT - Check workstream2 field config ===
// app.get("/api/debug/workstream2-fields", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT COUNT(*) as count FROM workstream2_field_config")
//     const fields = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order LIMIT 10")
//     const activeFields = await pool.query(
//       "SELECT COUNT(*) as active_count FROM workstream2_field_config WHERE is_active = true",
//     )

//     res.json({
//       success: true,
//       count: result.rows[0].count,
//       active_count: activeFields.rows[0].active_count,
//       sample_fields: fields.rows,
//       message: `Found ${result.rows[0].count} total fields (${activeFields.rows[0].active_count} active) in workstream2_field_config table`,
//     })
//   } catch (error) {
//     console.error("Error checking workstream2 fields:", error)
//     res.status(500).json({ success: false, message: error.message })
//   }
// })

// // === AUTHENTICATION ROUTES ===

// // Register Route
// app.post("/api/auth/register", async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     console.log("📝 Registration attempt for:", email, "Role:", role)
//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       })
//     }
//     if (password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "Password must be at least 6 characters long",
//       })
//     }
//     if (!["admin", "viewer"].includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Role must be either 'admin' or 'viewer'",
//       })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "User with this email already exists",
//       })
//     }
//     const saltRounds = 10
//     const hashedPassword = await bcrypt.hash(password, saltRounds)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     const user = newUser.rows[0]
//     await acl.addUserRoles(user.id.toString(), role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Registration successful for:", email, "Role:", role)
//     res.json({
//       success: true,
//       message: "Registration successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         created_at: user.created_at,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Registration error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Login Route
// app.post("/api/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body
//     console.log("🔐 Login attempt for:", email)
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required",
//       })
//     }
//     const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
//     if (userResult.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     const user = userResult.rows[0]
//     const isValidPassword = await bcrypt.compare(password, user.password)
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       })
//     }
//     await acl.addUserRoles(user.id.toString(), user.role)
//     const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
//       expiresIn: "24h",
//     })
//     console.log("✅ Login successful for:", email, "Role:", user.role)
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//     })
//   } catch (error) {
//     console.error("❌ Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     })
//   }
// })

// // Get user profile
// app.get("/api/auth/profile", authenticateToken, (req, res) => {
//   res.json({
//     success: true,
//     user: req.user,
//   })
// })

// // Workstreams API (Dynamic workstreams)
// app.post("/api/open/workstream-list", async (req, res) => {
//   const { name } = req.body
//   if (!name) return res.status(400).json({ success: false, message: "Name is required" })
//   try {
//     const result = await pool.query("INSERT INTO workstreams (name) VALUES ($1) RETURNING *", [name])
//     res.json({ success: true, data: result.rows[0] })
//   } catch (err) {
//     console.error("Error adding workstream:", err)
//     res.status(500).json({ success: false, message: "Failed to add workstream" })
//   }
// })

// app.get("/api/open/workstream-list", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
//     res.json({ success: true, data: result.rows })
//   } catch (err) {
//     console.error("Error fetching workstreams:", err)
//     res.status(500).json({ success: false, message: "Error fetching workstreams" })
//   }
// })

// // Get user permissions
// app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id.toString()
//     const userRoles = await acl.userRoles(userId)
//     const permissions = {}
//     const resources = ["users", "workstream", "dashboard", "reports", "settings", "profile"]
//     const permissionTypes = ["create", "read", "update", "delete", "admin-view", "viewer-view"]
//     for (const resource of resources) {
//       permissions[resource] = {}
//       for (const permission of permissionTypes) {
//         permissions[resource][permission] = await acl.isAllowed(userId, resource, permission)
//       }
//     }
//     res.json({
//       success: true,
//       user: req.user,
//       roles: userRoles,
//       permissions: permissions,
//     })
//   } catch (error) {
//     console.error("Error fetching permissions:", error)
//     res.status(500).json({ success: false, message: "Error fetching permissions" })
//   }
// })

// // === PROTECTED ROUTES WITH ACL ===

// // Admin only - Get all users
// app.get("/api/admin/users", authenticateToken, checkPermission("users", "read"), async (req, res) => {
//   try {
//     const users = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
//     res.json({
//       success: true,
//       users: users.rows,
//     })
//   } catch (error) {
//     console.error("Error fetching users:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Create user
// app.post("/api/admin/users", authenticateToken, checkPermission("users", "create"), async (req, res) => {
//   try {
//     const { name, email, password, role = "viewer" } = req.body
//     if (!name || !email || !password) {
//       return res.status(400).json({ success: false, message: "Name, email, and password are required" })
//     }
//     const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ success: false, message: "User already exists" })
//     }
//     const hashedPassword = await bcrypt.hash(password, 10)
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
//       [name, email, hashedPassword, role],
//     )
//     await acl.addUserRoles(newUser.rows[0].id.toString(), role)
//     res.json({
//       success: true,
//       message: "User created successfully",
//       user: newUser.rows[0],
//     })
//   } catch (error) {
//     console.error("Error creating user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Admin only - Delete user
// app.delete("/api/admin/users/:id", authenticateToken, checkPermission("users", "delete"), async (req, res) => {
//   try {
//     const userId = req.params.id
//     await acl.removeUserRoles(userId, await acl.userRoles(userId))
//     const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])
//     if (result.rows.length === 0) {
//       return res.status(404).json({ success: false, message: "User not found" })
//     }
//     res.json({
//       success: true,
//       message: "User deleted successfully",
//     })
//   } catch (error) {
//     console.error("Error deleting user:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Workstream routes with ACL protection
// app.get("/api/workstream", authenticateToken, checkPermission("workstream", "read"), async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM workspace_data ORDER BY id DESC")
//     // Parse conditional_fields for each record
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json({
//       success: true,
//       data: formattedData,
//     })
//   } catch (error) {
//     console.error("Error fetching workstream data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // === MAIN WORKSTREAM SUBMISSION ROUTE ===
// app.post("/api/workstream", upload.array("images", 10), async (req, res) => {
//   try {
//     const {
//       // ===== NEW FIELDS (From Reviewer Form) =====
//       fullName, // Maps to owner_name
//       registrationType, // Registration Type dropdown
//       reviewStatus, // Completed/Not Completed
//       reviewReason, // Reason when Not Completed
//       reviewType, // New Review/Re-Review
//       registrationPlatform, // Registration platform text
//       conditionalFields, // A1, A2, A3... fields
//       // ===== EXISTING FIELDS =====
//       accessibility,
//       third_party_content,
//       conditional_response,
//       website_type,
//       registration_site,
//       comments,
//       website_operator,
//       owner_name, // Keep this for backward compatibility
//       review_date,
//       calculated_friday,
//       review_month,
//       review_year,
//       review_traffic,
//       website_source_id,
//       website_url,
//       aChecks,
//     } = req.body

//     console.log("📝 Form submission received:")
//     console.log("New fields:", {
//       fullName,
//       registrationType,
//       reviewStatus,
//       reviewReason,
//       reviewType,
//       registrationPlatform,
//     })
//     console.log("🔧 Conditional fields received:", conditionalFields)
//     console.log("Existing fields:", { accessibility, third_party_content, website_url, owner_name })

//     // Handle website source ID
//     let finalWebsiteSourceId = website_source_id
//     if (!website_source_id && website_url) {
//       try {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       } catch (urlError) {
//         console.error("❌ Error handling website URL:", urlError)
//         throw new Error(`Website URL error: ${urlError.message}`)
//       }
//     }

//     const finalReviewDate = ensureDateString(review_date)
//     const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//     const { month, year } = getMonthAndYear(finalReviewDate)
//     const finalReviewMonth = review_month || month
//     const finalReviewYear = review_year || year

//     // Process images
//     let imageData = []
//     if (req.files && req.files.length > 0) {
//       imageData = req.files.map((file) => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         size: file.size,
//         mimetype: file.mimetype,
//         url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//       }))
//     }

//     // Parse aChecks
//     let parsedAChecks = []
//     if (aChecks) {
//       try {
//         parsedAChecks = typeof aChecks === "string" ? JSON.parse(aChecks) : aChecks
//       } catch (parseError) {
//         console.error("❌ Error parsing aChecks:", parseError)
//         parsedAChecks = []
//       }
//     }

//     // Parse conditional fields - FIXED
//     let parsedConditionalFields = {}
//     if (conditionalFields) {
//       try {
//         parsedConditionalFields =
//           typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//         console.log("✅ Parsed conditional fields:", parsedConditionalFields)
//       } catch (parseError) {
//         console.error("❌ Error parsing conditionalFields:", parseError)
//         parsedConditionalFields = {}
//       }
//     }

//     const imagesJSON = safeJSONStringify(imageData, "[]")
//     const aChecksJSON = safeJSONStringify(parsedAChecks, "[]")
//     const conditionalFieldsJSON = safeJSONStringify(parsedConditionalFields, "{}")

//     console.log("💾 Final conditional fields JSON:", conditionalFieldsJSON)

//     // Use fullName if provided, otherwise use owner_name
//     const finalOwnerName = fullName || owner_name

//     const insertQuery = `
//       INSERT INTO workspace_data (
//         registration_type, review_status, review_reason, review_type,
//         registration_platform, conditional_fields,
//         accessibility, third_party_content, conditional_response, website_type,
//         registration_site, comments, website_operator, owner_name, 
//         review_date, calculated_friday, review_month, review_year,
//         review_traffic, images, a_checks, website_source_id
//       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19, $20, $21, $22)
//       RETURNING id, review_date, calculated_friday, conditional_fields
//     `

//     const insertValues = [
//       // New fields
//       registrationType || null,
//       reviewStatus || null,
//       reviewReason || null,
//       reviewType || null,
//       registrationPlatform || null,
//       conditionalFieldsJSON, // This will be cast to JSONB
//       // Existing fields
//       accessibility || null,
//       third_party_content || null,
//       conditional_response || null,
//       website_type || null,
//       registration_site || null,
//       comments || null,
//       website_operator || null,
//       finalOwnerName || null,
//       finalReviewDate,
//       finalCalculatedFriday,
//       finalReviewMonth,
//       finalReviewYear,
//       review_traffic || null,
//       imagesJSON,
//       aChecksJSON,
//       finalWebsiteSourceId || null,
//     ]

//     console.log("💾 Inserting data with conditional fields:", conditionalFieldsJSON)

//     const result = await pool.query(insertQuery, insertValues)

//     console.log("✅ Form submitted successfully with ID:", result.rows[0].id)
//     console.log("✅ Stored conditional fields:", result.rows[0].conditional_fields)

//     res.status(200).json({
//       message: "Reviewer form submitted successfully!",
//       id: result.rows[0].id,
//       images: imageData,
//       website_source_id: finalWebsiteSourceId,
//       stored_review_date: ensureDateString(result.rows[0].review_date),
//       stored_calculated_friday: ensureDateString(result.rows[0].calculated_friday),
//       calculated_friday: finalCalculatedFriday,
//       review_month: finalReviewMonth,
//       review_year: finalReviewYear,
//       conditional_fields: result.rows[0].conditional_fields,
//     })
//   } catch (error) {
//     console.error("💥 === FORM SUBMISSION ERROR ===")
//     console.error("Error:", error)
//     if (req.files) {
//       req.files.forEach((file) => {
//         fs.unlink(file.path, (err) => {
//           if (err) console.error("Error deleting file:", err)
//         })
//       })
//     }
//     res.status(500).json({
//       error: "Failed to submit workstream data",
//       message: error.message,
//     })
//   }
// })

// // workstream2 - Get all workstream2 data
// app.get("/api/workstream2", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT * FROM workstream2_data 
//       ORDER BY created_at DESC
//     `)
//     res.json({ success: true, data: result.rows })
//   } catch (error) {
//     console.error("Error fetching workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Add new workstream2 record
// app.post("/api/workstream2", async (req, res) => {
//   try {
//     const {
//       case_no,
//       test_successful,
//       card_no,
//       card_country,
//       expiry_date,
//       cvv,
//       email,
//       tested_url_homepage,
//       tested_url,
//       tested_on_date,
//       tested_amount,
//       tested_currency,
//       billing_address_if_asked,
//       billing_phone_number,
//       billing_name,
//       declined_message,
//       not_tested_breakup,
//       comments,
//       id_verification_required,
//       bypass_id_verification,
//       violation,
//       tested_product,
//       merchant_name_bill,
//       log_generated,
//       transaction_gmt_date,
//       account_number_masked,
//       acquiring_identifier,
//       acquiring_user_bid,
//       acquirer_name,
//       acquiring_identifier_region,
//       acquirer_region,
//       acquiring_identifier_legal_country,
//       acquirer_country,
//       merchant_name_acceptor,
//       merchant_city,
//       merchant_state_code,
//       merchant_state,
//       merchant_country_code,
//       merchant_country,
//       merchant_category_code,
//       enriched_merchant_category,
//       card_acceptor_id,
//       card_acceptor_terminal_id,
//       pos_entry_mode,
//       enriched_pos_entry_mode,
//       pos_condition_code,
//       pos_condition,
//       transaction_identifier,
//       transaction_currency_code,
//       eci_moto_group_code,
//       metrics,
//       auth_transaction_count,
//       transaction_amount_usd,
//       auth_transaction_amount,
//     } = req.body

//     const result = await pool.query(
//       `
//       INSERT INTO workstream2_data (
//         case_no, test_successful, card_no, card_country, expiry_date, cvv, email,
//         tested_url_homepage, tested_url, tested_on_date, tested_amount, tested_currency,
//         billing_address_if_asked, billing_phone_number, billing_name, declined_message,
//         not_tested_breakup, comments, id_verification_required, bypass_id_verification,
//         violation, tested_product, merchant_name_bill, log_generated, transaction_gmt_date,
//         account_number_masked, acquiring_identifier, acquiring_user_bid, acquirer_name,
//         acquiring_identifier_region, acquirer_region, acquiring_identifier_legal_country,
//         acquirer_country, merchant_name_acceptor, merchant_city, merchant_state_code,
//         merchant_state, merchant_country_code, merchant_country, merchant_category_code,
//         enriched_merchant_category, card_acceptor_id, card_acceptor_terminal_id,
//         pos_entry_mode, enriched_pos_entry_mode, pos_condition_code, pos_condition,
//         transaction_identifier, transaction_currency_code, eci_moto_group_code,
//         metrics, auth_transaction_count, transaction_amount_usd, auth_transaction_amount
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
//         $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
//         $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
//         $51, $52, $53
//       ) RETURNING *
//     `,
//       [
//         case_no,
//         test_successful,
//         card_no,
//         card_country,
//         expiry_date,
//         cvv,
//         email,
//         tested_url_homepage,
//         tested_url,
//         tested_on_date,
//         tested_amount,
//         tested_currency,
//         billing_address_if_asked,
//         billing_phone_number,
//         billing_name,
//         declined_message,
//         not_tested_breakup,
//         comments,
//         id_verification_required,
//         bypass_id_verification,
//         violation,
//         tested_product,
//         merchant_name_bill,
//         log_generated,
//         transaction_gmt_date,
//         account_number_masked,
//         acquiring_identifier,
//         acquiring_user_bid,
//         acquirer_name,
//         acquiring_identifier_region,
//         acquirer_region,
//         acquiring_identifier_legal_country,
//         acquirer_country,
//         merchant_name_acceptor,
//         merchant_city,
//         merchant_state_code,
//         merchant_state,
//         merchant_country_code,
//         merchant_country,
//         merchant_category_code,
//         enriched_merchant_category,
//         card_acceptor_id,
//         card_acceptor_terminal_id,
//         pos_entry_mode,
//         enriched_pos_entry_mode,
//         pos_condition_code,
//         pos_condition,
//         transaction_identifier,
//         transaction_currency_code,
//         eci_moto_group_code,
//         metrics,
//         auth_transaction_count,
//         transaction_amount_usd,
//         auth_transaction_amount,
//       ],
//     )

//     res.json({ success: true, data: result.rows[0] })
//   } catch (error) {
//     console.error("Error adding workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Delete workstream2 record
// app.delete("/api/workstream2/:id", async (req, res) => {
//   try {
//     const { id } = req.params
//     await pool.query("DELETE FROM workstream2_data WHERE id = $1", [id])
//     res.json({ success: true, message: "Record deleted successfully" })
//   } catch (error) {
//     console.error("Error deleting workstream2 data:", error)
//     res.status(500).json({ success: false, message: "Server error" })
//   }
// })

// // Dashboard routes with different permissions
// app.get("/api/dashboard/admin", authenticateToken, checkPermission("dashboard", "admin-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Admin dashboard data",
//     data: {
//       totalUsers: 100,
//       totalWorkstreams: 50,
//       systemHealth: "Good",
//     },
//   })
// })

// app.get("/api/dashboard/viewer", authenticateToken, checkPermission("dashboard", "viewer-view"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Viewer dashboard data",
//     data: {
//       myWorkstreams: 5,
//       recentActivity: [],
//     },
//   })
// })

// // Route that requires multiple permissions
// app.get(
//   "/api/workstream/:id/sensitive",
//   authenticateToken,
//   checkAnyPermission([
//     { resource: "workstream", permission: "delete" },
//     { resource: "users", permission: "read" },
//   ]),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: "Sensitive workstream data",
//       data: { id: req.params.id },
//     })
//   },
// )

// // Test route
// app.get("/api/auth/test", (req, res) => {
//   res.json({
//     message: "🎉 ACL-powered auth system working!",
//     timestamp: new Date().toISOString(),
//   })
// })

// // === Auto-suggest URL APIs ===
// app.get("/api/website-sources", async (req, res) => {
//   const { search } = req.query
//   if (!search) return res.json([])
//   try {
//     const result = await pool.query("SELECT id, website_url FROM website_sources WHERE website_url ILIKE $1 LIMIT 10", [
//       `%${search}%`,
//     ])
//     res.json(result.rows)
//   } catch (error) {
//     console.error("❌ /api/website-sources error:", error.message)
//     res.status(500).json({ error: error.message })
//   }
// })

// // === Get All Workstream Entries ===
// app.get("/api/workspace_data", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       ORDER BY wd.id DESC
//     `)
//     const formattedData = result.rows.map((row) => ({
//       ...row,
//       review_date: ensureDateString(row.review_date),
//       calculated_friday: ensureDateString(row.calculated_friday),
//       conditional_fields: row.conditional_fields
//         ? typeof row.conditional_fields === "string"
//           ? JSON.parse(row.conditional_fields)
//           : row.conditional_fields
//         : {},
//     }))
//     res.json(formattedData)
//   } catch (err) {
//     console.error("❌ Error fetching all workspace data:", err)
//     res.status(500).json({ message: "Server Error", error: err.message })
//   }
// })

// // === Get Single Workstream Entry by ID ===
// app.get("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         wd.*,
//         ws.website_url
//       FROM workspace_data wd
//       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//       WHERE wd.id = $1
//     `,
//       [id],
//     )
//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = result.rows[0]
//     const formattedRecord = {
//       ...record,
//       review_date: ensureDateString(record.review_date),
//       calculated_friday: ensureDateString(record.calculated_friday),
//       conditional_fields: record.conditional_fields
//         ? typeof record.conditional_fields === "string"
//           ? JSON.parse(record.conditional_fields)
//           : record.conditional_fields
//         : {},
//     }
//     res.json(formattedRecord)
//   } catch (err) {
//     console.error("❌ Error fetching workspace_data by ID:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Update Workstream Entry by ID ===
// app.put(
//   "/api/workspace_data/:id",
//   (req, res, next) => {
//     const contentType = req.get("Content-Type") || ""
//     if (contentType.includes("multipart/form-data")) {
//       upload.array("images", 10)(req, res, next)
//     } else {
//       next()
//     }
//   },
//   async (req, res) => {
//     const id = req.params.id
//     console.log("🔄 Updating record ID:", id)
//     try {
//       let formData
//       let newImageFiles = []
//       let existingImages = []
//       const contentType = req.get("Content-Type") || ""
//       if (contentType.includes("multipart/form-data")) {
//         formData = req.body
//         if (req.files && req.files.length > 0) {
//           newImageFiles = req.files.map((file) => ({
//             filename: file.filename,
//             originalname: file.originalname,
//             size: file.size,
//             mimetype: file.mimetype,
//             url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
//           }))
//         }
//         if (formData.existing_images) {
//           try {
//             existingImages = JSON.parse(formData.existing_images)
//           } catch (e) {
//             console.error("Error parsing existing images:", e)
//             existingImages = []
//           }
//         }
//       } else {
//         formData = req.body
//         if (formData.images) {
//           try {
//             existingImages = typeof formData.images === "string" ? JSON.parse(formData.images) : formData.images
//           } catch (e) {
//             console.error("Error parsing images:", e)
//             existingImages = []
//           }
//         }
//       }

//       const {
//         // New fields
//         fullName,
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         conditionalFields,
//         // Existing fields
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         owner_name,
//         review_date,
//         calculated_friday,
//         review_month,
//         review_year,
//         review_traffic,
//         website_source_id,
//         website_url,
//         aChecks,
//       } = formData

//       let finalWebsiteSourceId = website_source_id
//       if (website_url && (!website_source_id || website_source_id === "")) {
//         const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
//         if (existingUrl.rows.length > 0) {
//           finalWebsiteSourceId = existingUrl.rows[0].id
//         } else {
//           const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
//             website_url,
//           ])
//           finalWebsiteSourceId = newUrl.rows[0].id
//         }
//       }

//       const finalReviewDate = ensureDateString(review_date)
//       const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
//       const { month, year } = getMonthAndYear(finalReviewDate)
//       const finalReviewMonth = review_month || month
//       const finalReviewYear = review_year || year

//       const allImages = [...existingImages, ...newImageFiles]
//       const imagesJSON = safeJSONStringify(allImages, "[]")

//       // Parse conditional fields - FIXED
//       let parsedConditionalFields = {}
//       if (conditionalFields) {
//         try {
//           parsedConditionalFields =
//             typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
//           console.log("🔄 Update - Parsed conditional fields:", parsedConditionalFields)
//         } catch (e) {
//           console.error("Error parsing conditionalFields:", e)
//         }
//       }

//       const finalOwnerName = fullName || owner_name

//       const updateQuery = `
//       UPDATE workspace_data SET 
//         registration_type = $1, review_status = $2, review_reason = $3, review_type = $4,
//         registration_platform = $5, conditional_fields = $6::jsonb,
//         accessibility = $7, third_party_content = $8, conditional_response = $9, website_type = $10,
//         registration_site = $11, comments = $12, website_operator = $13, owner_name = $14,
//         review_date = $15::date, calculated_friday = $16::date, review_month = $17, review_year = $18,
//         review_traffic = $19, website_source_id = $20, a_checks = $21, images = $22
//       WHERE id = $23
//       RETURNING *
//     `

//       const updateValues = [
//         registrationType,
//         reviewStatus,
//         reviewReason,
//         reviewType,
//         registrationPlatform,
//         safeJSONStringify(parsedConditionalFields, "{}"), // Cast to JSONB
//         accessibility,
//         third_party_content,
//         conditional_response,
//         website_type,
//         registration_site,
//         comments,
//         website_operator,
//         finalOwnerName,
//         finalReviewDate,
//         finalCalculatedFriday,
//         finalReviewMonth,
//         finalReviewYear,
//         review_traffic,
//         finalWebsiteSourceId,
//         aChecks || null,
//         imagesJSON,
//         id,
//       ]

//       const result = await pool.query(updateQuery, updateValues)

//       if (result.rows.length === 0) {
//         return res.status(404).json({ message: "Record not found" })
//       }

//       const updatedRecord = await pool.query(
//         `SELECT wd.*, ws.website_url FROM workspace_data wd
//        LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
//        WHERE wd.id = $1`,
//         [id],
//       )

//       const formattedUpdatedRecord = {
//         ...updatedRecord.rows[0],
//         review_date: ensureDateString(updatedRecord.rows[0].review_date),
//         calculated_friday: ensureDateString(updatedRecord.rows[0].calculated_friday),
//         conditional_fields: updatedRecord.rows[0].conditional_fields
//           ? typeof updatedRecord.rows[0].conditional_fields === "string"
//             ? JSON.parse(updatedRecord.rows[0].conditional_fields)
//             : updatedRecord.rows[0].conditional_fields
//           : {},
//       }

//       console.log("✅ Update successful")
//       res.json({
//         message: "Record updated successfully",
//         data: formattedUpdatedRecord,
//       })
//     } catch (err) {
//       console.error("❌ Error updating workspace_data:", err)
//       if (req.files) {
//         req.files.forEach((file) => {
//           fs.unlink(file.path, (err) => {
//             if (err) console.error("Error deleting file:", err)
//           })
//         })
//       }
//       res.status(500).json({ message: "Server error", error: err.message })
//     }
//   },
// )

// // === Delete Workstream Entry by ID ===
// app.delete("/api/workspace_data/:id", async (req, res) => {
//   const id = req.params.id
//   try {
//     const existingRecord = await pool.query("SELECT images FROM workspace_data WHERE id = $1", [id])
//     if (existingRecord.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     const record = existingRecord.rows[0]
//     if (record.images) {
//       try {
//         const images = typeof record.images === "string" ? JSON.parse(record.images) : record.images
//         if (Array.isArray(images)) {
//           images.forEach((image) => {
//             if (image.filename) {
//               const filePath = path.join(__dirname, "uploads", image.filename)
//               fs.unlink(filePath, (err) => {
//                 if (err) console.error("❌ Error deleting image file:", err)
//               })
//             }
//           })
//         }
//       } catch (parseError) {
//         console.error("❌ Error parsing images for cleanup:", parseError)
//       }
//     }
//     const deleteResult = await pool.query("DELETE FROM workspace_data WHERE id = $1 RETURNING id", [id])
//     if (deleteResult.rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" })
//     }
//     res.json({ message: "Record deleted successfully", deletedId: id })
//   } catch (err) {
//     console.error("❌ Error deleting workspace_data:", err)
//     res.status(500).json({ message: "Server error", error: err.message })
//   }
// })

// // === Error handling ===
// app.use((error, req, res, next) => {
//   console.error("❌ Unhandled error:", error)
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//   })
// })

// // === 404 handler ===
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.method} ${req.originalUrl} not found`,
//   })
// })

// // Start server
// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`)
//   console.log(`🔐 Auth test: http://localhost:${port}/api/auth/test`)
//   console.log(`👤 User permissions: http://localhost:${port}/api/auth/permissions`)
//   console.log("📋 ACL-Protected Routes:")
//   console.log("  GET  /api/admin/users - Admin only (users:read)")
//   console.log("  POST /api/admin/users - Admin only (users:create)")
//   console.log("  DELETE /api/admin/users/:id - Admin only (users:delete)")
//   console.log("  GET  /api/workstream - Read workstream (workstream:read)")
//   console.log("  POST /api/workstream - Create workstream (workstream:create)")
//   console.log("  GET  /api/dashboard/admin - Admin dashboard (dashboard:admin-view)")
//   console.log("  GET  /api/dashboard/viewer - Viewer dashboard (dashboard:viewer-view)")
//   console.log("📋 Workstream Routes:")
//   console.log("  GET  /api/open/workstream - Get workstream1 data")
//   console.log("  GET  /api/open/workstream/:workstreamId - Get specific workstream data")
//   console.log("  POST /api/open/workstream-list - Add new workstream")
//   console.log("  GET  /api/open/workstream-list - Get all workstreams")
//   console.log("📋 Dynamic Field Configuration:")
//   console.log("  GET  /api/admin/workstream/:workstreamId/field-config - Get field config")
//   console.log("  PUT  /api/admin/workstream/:workstreamId/field-config/:fieldName - Update field config")
//   console.log("  PUT  /api/admin/workstream/:workstreamId/field-config/toggle - Toggle field config")
//   console.log("  GET  /api/fields/:workstreamId - Get active fields")
//   console.log("  GET  /api/debug/workstream2-fields - Debug workstream2 fields")
// })




const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const ACL = require("acl")
require("dotenv").config()

const app = express()
const port = process.env.PORT || 5000

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey123!@#"

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// === Middleware ===
// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://127.0.0.1:5173","https://my-frontend-steel-mu.vercel.app"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   }),
// )


// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use("/uploads", express.static("uploads"))
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://my-frontend-steel-mu.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

app.options("*", cors()); // ✅ Keep this

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/uploads", express.static("uploads"))





// === Multer File Upload Config ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only image files are allowed!"), false)
  },
})

// === PostgreSQL Connection ===
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Workstream1",
  password: "Ayansh@03",
  port: 5432,
})

// === ACL Setup ===
let acl
const initializeACL = async () => {
  try {
    acl = new ACL(new ACL.memoryBackend())
    await acl.allow([
      {
        roles: ["admin"],
        allows: [
          { resources: "users", permissions: ["create", "read", "update", "delete"] },
          { resources: "workstream", permissions: ["create", "read", "update", "delete"] },
          { resources: "dashboard", permissions: ["read", "admin-view"] },
          { resources: "reports", permissions: ["create", "read", "update", "delete"] },
          { resources: "settings", permissions: ["read", "update"] },
        ],
      },
      {
        roles: ["viewer"],
        allows: [
          { resources: "workstream", permissions: ["read"] },
          { resources: "dashboard", permissions: ["read", "viewer-view"] },
          { resources: "reports", permissions: ["read"] },
          { resources: "profile", permissions: ["read", "update"] },
        ],
      },
    ])
    await acl.addRoleParents("admin", ["viewer"])
    console.log("✅ ACL initialized successfully")
  } catch (error) {
    console.error("❌ ACL initialization error:", error)
  }
}
initializeACL()

// === Authentication Middleware ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).json({ message: "Access token required" })
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [decoded.userId])
    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User not found" })
    }
    req.user = user.rows[0]
    next()
  } catch (error) {
    console.error("Token verification error:", error)
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

// === ACL Authorization Middleware ===
const checkPermission = (resource, permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" })
      }
      const userId = req.user.id.toString()
      const userRole = req.user.role
      await acl.addUserRoles(userId, userRole)
      const hasPermission = await acl.isAllowed(userId, resource, permission)
      if (!hasPermission) {
        return res.status(403).json({
          message: "Access denied",
          required: { resource, permission },
          userRole: userRole,
        })
      }
      next()
    } catch (error) {
      console.error("ACL permission check error:", error)
      return res.status(500).json({ message: "Permission check failed" })
    }
  }
}

// === Helper function to check multiple permissions ===
const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" })
      }
      const userId = req.user.id.toString()
      const userRole = req.user.role
      await acl.addUserRoles(userId, userRole)
      let hasAnyPermission = false
      for (const { resource, permission } of permissions) {
        const allowed = await acl.isAllowed(userId, resource, permission)
        if (allowed) {
          hasAnyPermission = true
          break
        }
      }
      if (!hasAnyPermission) {
        return res.status(403).json({
          message: "Access denied",
          required: permissions,
          userRole: userRole,
        })
      }
      next()
    } catch (error) {
      console.error("ACL multiple permission check error:", error)
      return res.status(500).json({ message: "Permission check failed" })
    }
  }
}

// === Date handling functions ===
const isValidDateString = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  const [year, month, day] = dateStr.split("-").map(Number)
  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
}

const getFridayOfWeek = (dateStr) => {
  if (!isValidDateString(dateStr)) {
    console.error("❌ Invalid date string:", dateStr)
    return null
  }
  try {
    const [year, month, day] = dateStr.split("-").map(Number)
    let adjustedMonth = month
    let adjustedYear = year
    if (month < 3) {
      adjustedMonth += 12
      adjustedYear -= 1
    }
    const q = day
    const m = adjustedMonth
    const k = adjustedYear % 100
    const j = Math.floor(adjustedYear / 100)
    const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7
    const dayOfWeek = (h + 5) % 7
    const daysToFriday = (4 - dayOfWeek + 7) % 7
    let fridayDay = day + daysToFriday
    let fridayMonth = month
    let fridayYear = year
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (fridayYear % 4 === 0 && (fridayYear % 100 !== 0 || fridayYear % 400 === 0)) {
      daysInMonth[1] = 29
    }
    if (fridayDay > daysInMonth[fridayMonth - 1]) {
      fridayDay = fridayDay - daysInMonth[fridayMonth - 1]
      fridayMonth += 1
      if (fridayMonth > 12) {
        fridayMonth = 1
        fridayYear += 1
      }
    }
    const result = `${fridayYear}-${String(fridayMonth).padStart(2, "0")}-${String(fridayDay).padStart(2, "0")}`
    return result
  } catch (error) {
    console.error("❌ Error calculating Friday:", error)
    return null
  }
}

const getMonthAndYear = (dateStr) => {
  if (!isValidDateString(dateStr)) {
    return { month: null, year: null }
  }
  try {
    const [year, month] = dateStr.split("-").map(Number)
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    return {
      month: monthNames[month - 1],
      year: year,
    }
  } catch (error) {
    console.error("❌ Error calculating month/year:", error)
    return { month: null, year: null }
  }
}

const ensureDateString = (dateValue) => {
  if (!dateValue) return null
  if (typeof dateValue === "string" && isValidDateString(dateValue)) {
    return dateValue
  }
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear()
    const month = String(dateValue.getMonth() + 1).padStart(2, "0")
    const day = String(dateValue.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    const datePart = dateValue.split("T")[0]
    if (isValidDateString(datePart)) {
      return datePart
    }
  }
  console.error("❌ Could not convert to date string:", dateValue)
  return null
}

const safeJSONStringify = (data, fallback = "[]") => {
  try {
    if (data === null || data === undefined) {
      return fallback
    }
    if (typeof data === "string") {
      const parsed = JSON.parse(data)
      return JSON.stringify(parsed)
    }
    return JSON.stringify(data)
  } catch (error) {
    console.error("❌ JSON stringify error:", error)
    return fallback
  }
}

// === ROUTES ===

// User list
app.get("/api/open/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
    res.json({ success: true, users: result.rows })
  } catch (err) {
    console.error("Error fetching users:", err.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Delete user item
app.post("/api/admin/delete-users", async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "No user IDs provided" })
  }
  try {
    const result = await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [ids])
    res.status(200).json({ message: "Users deleted successfully", deleted: result.rowCount })
  } catch (error) {
    console.error("Delete error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Workstream listing (Original workstream1 data)
app.get("/api/open/workstream", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        wd.*,
        ws.website_url
      FROM workspace_data wd
      LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
      ORDER BY wd.id DESC
    `)
    // Parse conditional_fields for each record
    const formattedData = result.rows.map((row) => ({
      ...row,
      conditional_fields: row.conditional_fields
        ? typeof row.conditional_fields === "string"
          ? JSON.parse(row.conditional_fields)
          : row.conditional_fields
        : {},
    }))
    res.json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error fetching open workstream data:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Get specific workstream data by workstream ID (NEW ENDPOINT)
app.get("/api/open/workstream/:workstreamId", async (req, res) => {
  const { workstreamId } = req.params

  try {
    // If it's workstream1, use the existing logic
    if (workstreamId === "workstream1") {
      const result = await pool.query(`
        SELECT 
          wd.*,
          ws.website_url
        FROM workspace_data wd
        LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
        ORDER BY wd.id DESC
      `)

      const formattedData = result.rows.map((row) => ({
        ...row,
        conditional_fields: row.conditional_fields
          ? typeof row.conditional_fields === "string"
            ? JSON.parse(row.conditional_fields)
            : row.conditional_fields
          : {},
      }))

      return res.json({
        success: true,
        data: formattedData,
      })
    }

    // For workstream2, use the workstream2_data table
    if (workstreamId === "workstream2") {
      const result = await pool.query(`
        SELECT * FROM workstream2_data 
        ORDER BY created_at DESC
      `)

      return res.json({
        success: true,
        data: result.rows,
      })
    }

    // For other dynamic workstreams, fetch data based on workstream_id
    const result = await pool.query(
      `
      SELECT 
        wd.*,
        ws.website_url
      FROM workspace_data wd
      LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
      WHERE wd.workstream_id = $1
      ORDER BY wd.id DESC
    `,
      [workstreamId],
    )

    const formattedData = result.rows.map((row) => ({
      ...row,
      conditional_fields: row.conditional_fields
        ? typeof row.conditional_fields === "string"
          ? JSON.parse(row.conditional_fields)
          : row.conditional_fields
        : {},
    }))

    res.json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error fetching workstream data:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// For GET /api/open/workstream1
app.get("/api/open/workstream1", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workspace_data")
    // Parse conditional_fields for each record
    const formattedData = result.rows.map((row) => ({
      ...row,
      conditional_fields: row.conditional_fields
        ? typeof row.conditional_fields === "string"
          ? JSON.parse(row.conditional_fields)
          : row.conditional_fields
        : {},
    }))
    res.json({ success: true, data: formattedData })
  } catch (err) {
    console.error("Error fetching workstream1 data:", err)
    res.status(500).json({ success: false, message: "Internal Server Error" })
  }
})

// Delete workstream data by ID
app.delete("/api/open/workstream/:id", async (req, res) => {
  const { id } = req.params
  try {
    await pool.query("DELETE FROM workspace_data WHERE id = $1", [id])
    res.json({ success: true, message: "Record deleted successfully" })
  } catch (error) {
    console.error("Error deleting workstream record:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Workstream data active for fields
app.get("/api/fields/workstream1", async (req, res) => {
  try {
    const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
    res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.get("/api/admin/field-config", async (req, res) => {
  const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
  res.json({ success: true, data: result.rows })
})


// Get single record by its database ID (not workstreamId)
app.get("/api/open/workstream-record/:id", async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(`
      SELECT 
        wd.*,
        ws.website_url
      FROM workspace_data wd
      LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
      WHERE wd.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.json({ success: true, data: [] }) // Or return 404
    }

    const row = result.rows[0]
    const formatted = {
      ...row,
      conditional_fields: row.conditional_fields
        ? typeof row.conditional_fields === "string"
          ? JSON.parse(row.conditional_fields)
          : row.conditional_fields
        : {},
    }

    res.json({ success: true, data: [formatted] })
  } catch (err) {
    console.error("Error fetching record:", err)
    res.status(500).json({ success: false, message: "Internal Server Error" })
  }
})

// === FIELD DEFINITIONS API (Missing endpoint) ===
app.get("/api/admin/field-definitions", async (req, res) => {
  try {
    // This endpoint should return all available field definitions
    // For now, we'll return a combined list from both workstream configs
    const workstream1Fields = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
    const workstream2Fields = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")

    // Format the response to match what the frontend expects
    const allFields = [
      ...workstream1Fields.rows.map((field) => ({
        id: `ws1_${field.id}`,
        field_name: field.field_name,
        field_label: field.display_name || field.field_name,
        field_type: field.field_type || "text",
        is_required: field.is_required || false,
        help_text: field.placeholder_text || "",
        workstream: "workstream1",
      })),
      ...workstream2Fields.rows.map((field) => ({
        id: `ws2_${field.id}`,
        field_name: field.field_name,
        field_label: field.display_name || field.field_name,
        field_type: field.field_type || "text",
        is_required: field.is_required || false,
        help_text: field.placeholder_text || "",
        workstream: "workstream2",
      })),
    ]

    res.json({ success: true, data: allFields })
  } catch (error) {
    console.error("Error fetching field definitions:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

app.put("/api/admin/field-config/:fieldName", async (req, res) => {
  const { fieldName } = req.params
  const { is_active } = req.body
  try {
    await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [is_active, fieldName])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// === DYNAMIC API ROUTES FOR WORKSTREAMS ===

// Get all workstreams (for the workstreams page)
app.get("/api/admin/workstreams", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error("Error fetching workstreams:", err)
    res.status(500).json({ success: false, message: "Error fetching workstreams" })
  }
})

// Get field configuration for a specific workstream (DYNAMIC)
app.get("/api/admin/workstream/:workstreamId/field-config", async (req, res) => {
  const { workstreamId } = req.params

  try {
    console.log(`🔍 Fetching field config for: ${workstreamId}`)

    // For workstream1, use the existing field config table
    if (workstreamId === "workstream1") {
      const result = await pool.query("SELECT * FROM workstream1_field_config ORDER BY id")
      console.log(`✅ Found ${result.rows.length} fields for workstream1`)
      return res.json({ success: true, data: result.rows })
    }

    // For workstream2, use the new dynamic field config table
    if (workstreamId === "workstream2") {
      const result = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order, id")
      console.log(`✅ Found ${result.rows.length} fields for workstream2`)
      return res.json({ success: true, data: result.rows })
    }

    // For other workstreams, return empty array for now
    console.log(`⚠️ No field config found for: ${workstreamId}`)
    res.json({ success: true, data: [] })
  } catch (error) {
    console.error("Error fetching field config:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// === FIELD TOGGLE ENDPOINT (COMPLETELY FIXED) ===
app.put("/api/admin/workstream/:workstreamId/field-config/toggle", async (req, res) => {
  const { workstreamId } = req.params
  const { field_name, is_active } = req.body

  console.log(`🔄 Toggle request received:`)
  console.log(`   - Workstream: ${workstreamId}`)
  console.log(`   - Request body:`, req.body)
  console.log(`   - Field name: ${field_name}`)
  console.log(`   - Is active: ${is_active}`)

  // Validate required parameters
  if (!field_name) {
    console.log(`❌ Missing field_name in request body`)
    return res.status(400).json({
      success: false,
      message: "field_name is required",
      received: req.body,
    })
  }

  if (is_active === undefined || is_active === null) {
    console.log(`❌ Missing is_active in request body`)
    return res.status(400).json({
      success: false,
      message: "is_active is required",
      received: req.body,
    })
  }

  try {
    // For workstream1, update the existing table
    if (workstreamId === "workstream1") {
      console.log(`🔄 Updating workstream1 field: ${field_name}`)
      const result = await pool.query(
        "UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2 RETURNING *",
        [is_active, field_name],
      )

      if (result.rows.length === 0) {
        console.log(`❌ Field not found in workstream1: ${field_name}`)
        return res.status(404).json({ success: false, message: "Field not found" })
      }

      console.log(`✅ Updated workstream1 field: ${field_name} to ${is_active}`)
      return res.json({ success: true, data: result.rows[0] })
    }

    // For workstream2, update the new dynamic table
    if (workstreamId === "workstream2") {
      console.log(`🔄 Updating workstream2 field: ${field_name}`)
      const result = await pool.query(
        "UPDATE workstream2_field_config SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE field_name = $2 RETURNING *",
        [is_active, field_name],
      )

      if (result.rows.length === 0) {
        console.log(`❌ Field not found in workstream2: ${field_name}`)
        // Let's check what fields exist
        const existingFields = await pool.query("SELECT field_name FROM workstream2_field_config LIMIT 5")
        console.log(
          `Available fields sample:`,
          existingFields.rows.map((r) => r.field_name),
        )
        return res.status(404).json({
          success: false,
          message: "Field not found",
          availableFields: existingFields.rows.map((r) => r.field_name),
        })
      }

      console.log(`✅ Updated workstream2 field: ${field_name} to ${is_active}`)
      return res.json({ success: true, data: result.rows[0] })
    }

    // For other workstreams, just return success
    console.log(`⚠️ Unknown workstream: ${workstreamId}`)
    res.json({ success: true, message: `Field ${field_name} updated for ${workstreamId}` })
  } catch (err) {
    console.error("❌ Error toggling field:", err)
    res.status(500).json({ success: false, message: "Server error", error: err.message })
  }
})

// Update field configuration for a specific workstream (DYNAMIC)
app.put("/api/admin/workstream/:workstreamId/field-config/:fieldName", async (req, res) => {
  const { workstreamId, fieldName } = req.params
  const { is_active } = req.body

  try {
    // For workstream1, update the existing table
    if (workstreamId === "workstream1") {
      await pool.query("UPDATE workstream1_field_config SET is_active = $1 WHERE field_name = $2", [
        is_active,
        fieldName,
      ])
      return res.json({ success: true })
    }

    // For workstream2, update the new dynamic table
    if (workstreamId === "workstream2") {
      const result = await pool.query(
        "UPDATE workstream2_field_config SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE field_name = $2 RETURNING *",
        [is_active, fieldName],
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Field not found" })
      }

      return res.json({ success: true, data: result.rows[0] })
    }

    // For other workstreams, just return success
    res.json({ success: true, message: `Field ${fieldName} updated for ${workstreamId}` })
  } catch (err) {
    console.error("Error updating field config:", err)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Get active fields for a specific workstream (DYNAMIC)
app.get("/api/fields/:workstreamId", async (req, res) => {
  const { workstreamId } = req.params

  try {
    // For workstream1, use the existing logic
    if (workstreamId === "workstream1") {
      const result = await pool.query("SELECT field_name FROM workstream1_field_config WHERE is_active = TRUE")
      return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
    }

    // For workstream2, use the dynamic field config table
    if (workstreamId === "workstream2") {
      const result = await pool.query(
        "SELECT field_name FROM workstream2_field_config WHERE is_active = TRUE ORDER BY field_order, id",
      )
      return res.json({ success: true, fields: result.rows.map((r) => r.field_name) })
    }

    // For other workstreams, return empty array
    res.json({ success: true, fields: [] })
  } catch (err) {
    console.error("Error fetching active fields:", err)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// === DEBUG ENDPOINT - Check workstream2 field config ===
app.get("/api/debug/workstream2-fields", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM workstream2_field_config")
    const fields = await pool.query("SELECT * FROM workstream2_field_config ORDER BY field_order LIMIT 10")
    const activeFields = await pool.query(
      "SELECT COUNT(*) as active_count FROM workstream2_field_config WHERE is_active = true",
    )

    res.json({
      success: true,
      count: result.rows[0].count,
      active_count: activeFields.rows[0].active_count,
      sample_fields: fields.rows,
      message: `Found ${result.rows[0].count} total fields (${activeFields.rows[0].active_count} active) in workstream2_field_config table`,
    })
  } catch (error) {
    console.error("Error checking workstream2 fields:", error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// === AUTHENTICATION ROUTES ===

// Register Route
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "viewer" } = req.body
    console.log("📝 Registration attempt for:", email, "Role:", role)
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      })
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      })
    }
    if (!["admin", "viewer"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either 'admin' or 'viewer'",
      })
    }
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      })
    }
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, email, hashedPassword, role],
    )
    const user = newUser.rows[0]
    await acl.addUserRoles(user.id.toString(), role)
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    })
    console.log("✅ Registration successful for:", email, "Role:", role)
    res.json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    console.error("❌ Registration error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
})

// Login Route
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    console.log("🔐 Login attempt for:", email)
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      })
    }
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }
    const user = userResult.rows[0]
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }
    await acl.addUserRoles(user.id.toString(), user.role)
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    })
    console.log("✅ Login successful for:", email, "Role:", user.role)
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("❌ Login error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
})

// Get user profile
app.get("/api/auth/profile", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  })
})

// Workstreams API (Dynamic workstreams)
app.post("/api/open/workstream-list", async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ success: false, message: "Name is required" })
  try {
    const result = await pool.query("INSERT INTO workstreams (name) VALUES ($1) RETURNING *", [name])
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error("Error adding workstream:", err)
    res.status(500).json({ success: false, message: "Failed to add workstream" })
  }
})

app.get("/api/open/workstream-list", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workstreams ORDER BY id")
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error("Error fetching workstreams:", err)
    res.status(500).json({ success: false, message: "Error fetching workstreams" })
  }
})

// Get user permissions
app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id.toString()
    const userRoles = await acl.userRoles(userId)
    const permissions = {}
    const resources = ["users", "workstream", "dashboard", "reports", "settings", "profile"]
    const permissionTypes = ["create", "read", "update", "delete", "admin-view", "viewer-view"]
    for (const resource of resources) {
      permissions[resource] = {}
      for (const permission of permissionTypes) {
        permissions[resource][permission] = await acl.isAllowed(userId, resource, permission)
      }
    }
    res.json({
      success: true,
      user: req.user,
      roles: userRoles,
      permissions: permissions,
    })
  } catch (error) {
    console.error("Error fetching permissions:", error)
    res.status(500).json({ success: false, message: "Error fetching permissions" })
  }
})

// === PROTECTED ROUTES WITH ACL ===

// Admin only - Get all users
app.get("/api/admin/users", authenticateToken, checkPermission("users", "read"), async (req, res) => {
  try {
    const users = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC")
    res.json({
      success: true,
      users: users.rows,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Admin only - Create user
app.post("/api/admin/users", authenticateToken, checkPermission("users", "create"), async (req, res) => {
  try {
    const { name, email, password, role = "viewer" } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" })
    }
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User already exists" })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, email, hashedPassword, role],
    )
    await acl.addUserRoles(newUser.rows[0].id.toString(), role)
    res.json({
      success: true,
      message: "User created successfully",
      user: newUser.rows[0],
    })
  } catch (error) {
    console.error("Error creating user:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Admin only - Delete user
app.delete("/api/admin/users/:id", authenticateToken, checkPermission("users", "delete"), async (req, res) => {
  try {
    const userId = req.params.id
    await acl.removeUserRoles(userId, await acl.userRoles(userId))
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }
    res.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Workstream routes with ACL protection
app.get("/api/workstream", authenticateToken, checkPermission("workstream", "read"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workspace_data ORDER BY id DESC")
    // Parse conditional_fields for each record
    const formattedData = result.rows.map((row) => ({
      ...row,
      conditional_fields: row.conditional_fields
        ? typeof row.conditional_fields === "string"
          ? JSON.parse(row.conditional_fields)
          : row.conditional_fields
        : {},
    }))
    res.json({
      success: true,
      data: formattedData,
    })
  } catch (error) {
    console.error("Error fetching workstream data:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// === MAIN WORKSTREAM SUBMISSION ROUTE ===
app.post("/api/workstream", upload.array("images", 10), async (req, res) => {
  try {
    const {
      // ===== NEW FIELDS (From Reviewer Form) =====
      fullName, // Maps to owner_name
      registrationType, // Registration Type dropdown
      reviewStatus, // Completed/Not Completed
      reviewReason, // Reason when Not Completed
      reviewType, // New Review/Re-Review
      registrationPlatform, // Registration platform text
      conditionalFields, // A1, A2, A3... fields
      // ===== EXISTING FIELDS =====
      accessibility,
      third_party_content,
      conditional_response,
      website_type,
      registration_site,
      comments,
      website_operator,
      owner_name, // Keep this for backward compatibility
      review_date,
      calculated_friday,
      review_month,
      review_year,
      review_traffic,
      website_source_id,
      website_url,
      aChecks,
    } = req.body

    console.log("📝 Form submission received:")
    console.log("New fields:", {
      fullName,
      registrationType,
      reviewStatus,
      reviewReason,
      reviewType,
      registrationPlatform,
    })
    console.log("🔧 Conditional fields received:", conditionalFields)
    console.log("Existing fields:", { accessibility, third_party_content, website_url, owner_name })

    // Handle website source ID
    let finalWebsiteSourceId = website_source_id
    if (!website_source_id && website_url) {
      try {
        const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
        if (existingUrl.rows.length > 0) {
          finalWebsiteSourceId = existingUrl.rows[0].id
        } else {
          const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
            website_url,
          ])
          finalWebsiteSourceId = newUrl.rows[0].id
        }
      } catch (urlError) {
        console.error("❌ Error handling website URL:", urlError)
        throw new Error(`Website URL error: ${urlError.message}`)
      }
    }

    const finalReviewDate = ensureDateString(review_date)
    const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
    const { month, year } = getMonthAndYear(finalReviewDate)
    const finalReviewMonth = review_month || month
    const finalReviewYear = review_year || year

    // Process images
    let imageData = []
    if (req.files && req.files.length > 0) {
      imageData = req.files.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
      }))
    }

    // Parse aChecks
    let parsedAChecks = []
    if (aChecks) {
      try {
        parsedAChecks = typeof aChecks === "string" ? JSON.parse(aChecks) : aChecks
      } catch (parseError) {
        console.error("❌ Error parsing aChecks:", parseError)
        parsedAChecks = []
      }
    }

    // Parse conditional fields - FIXED
    let parsedConditionalFields = {}
    if (conditionalFields) {
      try {
        parsedConditionalFields =
          typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
        console.log("✅ Parsed conditional fields:", parsedConditionalFields)
      } catch (parseError) {
        console.error("❌ Error parsing conditionalFields:", parseError)
        parsedConditionalFields = {}
      }
    }

    const imagesJSON = safeJSONStringify(imageData, "[]")
    const aChecksJSON = safeJSONStringify(parsedAChecks, "[]")
    const conditionalFieldsJSON = safeJSONStringify(parsedConditionalFields, "{}")

    console.log("💾 Final conditional fields JSON:", conditionalFieldsJSON)

    // Use fullName if provided, otherwise use owner_name
    const finalOwnerName = fullName || owner_name

    const insertQuery = `
      INSERT INTO workspace_data (
        registration_type, review_status, review_reason, review_type,
        registration_platform, conditional_fields,
        accessibility, third_party_content, conditional_response, website_type,
        registration_site, comments, website_operator, owner_name, 
        review_date, calculated_friday, review_month, review_year,
        review_traffic, images, a_checks, website_source_id
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15::date, $16::date, $17, $18, $19, $20, $21, $22)
      RETURNING id, review_date, calculated_friday, conditional_fields
    `

    const insertValues = [
      // New fields
      registrationType || null,
      reviewStatus || null,
      reviewReason || null,
      reviewType || null,
      registrationPlatform || null,
      conditionalFieldsJSON, // This will be cast to JSONB
      // Existing fields
      accessibility || null,
      third_party_content || null,
      conditional_response || null,
      website_type || null,
      registration_site || null,
      comments || null,
      website_operator || null,
      finalOwnerName || null,
      finalReviewDate,
      finalCalculatedFriday,
      finalReviewMonth,
      finalReviewYear,
      review_traffic || null,
      imagesJSON,
      aChecksJSON,
      finalWebsiteSourceId || null,
    ]

    console.log("💾 Inserting data with conditional fields:", conditionalFieldsJSON)

    const result = await pool.query(insertQuery, insertValues)

    console.log("✅ Form submitted successfully with ID:", result.rows[0].id)
    console.log("✅ Stored conditional fields:", result.rows[0].conditional_fields)

    res.status(200).json({
      message: "Reviewer form submitted successfully!",
      id: result.rows[0].id,
      images: imageData,
      website_source_id: finalWebsiteSourceId,
      stored_review_date: ensureDateString(result.rows[0].review_date),
      stored_calculated_friday: ensureDateString(result.rows[0].calculated_friday),
      calculated_friday: finalCalculatedFriday,
      review_month: finalReviewMonth,
      review_year: finalReviewYear,
      conditional_fields: result.rows[0].conditional_fields,
    })
  } catch (error) {
    console.error("💥 === FORM SUBMISSION ERROR ===")
    console.error("Error:", error)
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting file:", err)
        })
      })
    }
    res.status(500).json({
      error: "Failed to submit workstream data",
      message: error.message,
    })
  }
})

// workstream2 - Get all workstream2 data
app.get("/api/workstream2", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM workstream2_data 
      ORDER BY created_at DESC
    `)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error("Error fetching workstream2 data:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Add new workstream2 record
app.post("/api/workstream2", async (req, res) => {
  try {
    const {
      case_no,
      test_successful,
      card_no,
      card_country,
      expiry_date,
      cvv,
      email,
      tested_url_homepage,
      tested_url,
      tested_on_date,
      tested_amount,
      tested_currency,
      billing_address_if_asked,
      billing_phone_number,
      billing_name,
      declined_message,
      not_tested_breakup,
      comments,
      id_verification_required,
      bypass_id_verification,
      violation,
      tested_product,
      merchant_name_bill,
      log_generated,
      transaction_gmt_date,
      account_number_masked,
      acquiring_identifier,
      acquiring_user_bid,
      acquirer_name,
      acquiring_identifier_region,
      acquirer_region,
      acquiring_identifier_legal_country,
      acquirer_country,
      merchant_name_acceptor,
      merchant_city,
      merchant_state_code,
      merchant_state,
      merchant_country_code,
      merchant_country,
      merchant_category_code,
      enriched_merchant_category,
      card_acceptor_id,
      card_acceptor_terminal_id,
      pos_entry_mode,
      enriched_pos_entry_mode,
      pos_condition_code,
      pos_condition,
      transaction_identifier,
      transaction_currency_code,
      eci_moto_group_code,
      metrics,
      auth_transaction_count,
      transaction_amount_usd,
      auth_transaction_amount,
    } = req.body

    const result = await pool.query(
      `
      INSERT INTO workstream2_data (
        case_no, test_successful, card_no, card_country, expiry_date, cvv, email,
        tested_url_homepage, tested_url, tested_on_date, tested_amount, tested_currency,
        billing_address_if_asked, billing_phone_number, billing_name, declined_message,
        not_tested_breakup, comments, id_verification_required, bypass_id_verification,
        violation, tested_product, merchant_name_bill, log_generated, transaction_gmt_date,
        account_number_masked, acquiring_identifier, acquiring_user_bid, acquirer_name,
        acquiring_identifier_region, acquirer_region, acquiring_identifier_legal_country,
        acquirer_country, merchant_name_acceptor, merchant_city, merchant_state_code,
        merchant_state, merchant_country_code, merchant_country, merchant_category_code,
        enriched_merchant_category, card_acceptor_id, card_acceptor_terminal_id,
        pos_entry_mode, enriched_pos_entry_mode, pos_condition_code, pos_condition,
        transaction_identifier, transaction_currency_code, eci_moto_group_code,
        metrics, auth_transaction_count, transaction_amount_usd, auth_transaction_amount
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
        $51, $52, $53
      ) RETURNING *
    `,
      [
        case_no,
        test_successful,
        card_no,
        card_country,
        expiry_date,
        cvv,
        email,
        tested_url_homepage,
        tested_url,
        tested_on_date,
        tested_amount,
        tested_currency,
        billing_address_if_asked,
        billing_phone_number,
        billing_name,
        declined_message,
        not_tested_breakup,
        comments,
        id_verification_required,
        bypass_id_verification,
        violation,
        tested_product,
        merchant_name_bill,
        log_generated,
        transaction_gmt_date,
        account_number_masked,
        acquiring_identifier,
        acquiring_user_bid,
        acquirer_name,
        acquiring_identifier_region,
        acquirer_region,
        acquiring_identifier_legal_country,
        acquirer_country,
        merchant_name_acceptor,
        merchant_city,
        merchant_state_code,
        merchant_state,
        merchant_country_code,
        merchant_country,
        merchant_category_code,
        enriched_merchant_category,
        card_acceptor_id,
        card_acceptor_terminal_id,
        pos_entry_mode,
        enriched_pos_entry_mode,
        pos_condition_code,
        pos_condition,
        transaction_identifier,
        transaction_currency_code,
        eci_moto_group_code,
        metrics,
        auth_transaction_count,
        transaction_amount_usd,
        auth_transaction_amount,
      ],
    )

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error("Error adding workstream2 data:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Delete workstream2 record
app.delete("/api/workstream2/:id", async (req, res) => {
  try {
    const { id } = req.params
    await pool.query("DELETE FROM workstream2_data WHERE id = $1", [id])
    res.json({ success: true, message: "Record deleted successfully" })
  } catch (error) {
    console.error("Error deleting workstream2 data:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// Dashboard routes with different permissions
app.get("/api/dashboard/admin", authenticateToken, checkPermission("dashboard", "admin-view"), (req, res) => {
  res.json({
    success: true,
    message: "Admin dashboard data",
    data: {
      totalUsers: 100,
      totalWorkstreams: 50,
      systemHealth: "Good",
    },
  })
})

app.get("/api/dashboard/viewer", authenticateToken, checkPermission("dashboard", "viewer-view"), (req, res) => {
  res.json({
    success: true,
    message: "Viewer dashboard data",
    data: {
      myWorkstreams: 5,
      recentActivity: [],
    },
  })
})

// Route that requires multiple permissions
app.get(
  "/api/workstream/:id/sensitive",
  authenticateToken,
  checkAnyPermission([
    { resource: "workstream", permission: "delete" },
    { resource: "users", permission: "read" },
  ]),
  (req, res) => {
    res.json({
      success: true,
      message: "Sensitive workstream data",
      data: { id: req.params.id },
    })
  },
)

// Test route
app.get("/api/auth/test", (req, res) => {
  res.json({
    message: "🎉 ACL-powered auth system working!",
    timestamp: new Date().toISOString(),
  })
})

// === Auto-suggest URL APIs ===
app.get("/api/website-sources", async (req, res) => {
  const { search } = req.query
  if (!search) return res.json([])
  try {
    const result = await pool.query("SELECT id, website_url FROM website_sources WHERE website_url ILIKE $1 LIMIT 10", [
      `%${search}%`,
    ])
    res.json(result.rows)
  } catch (error) {
    console.error("❌ /api/website-sources error:", error.message)
    res.status(500).json({ error: error.message })
  }
})

// === Get All Workstream Entries ===
app.get("/api/workspace_data", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        wd.*,
        ws.website_url
      FROM workspace_data wd
      LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
      ORDER BY wd.id DESC
    `)
    const formattedData = result.rows.map((row) => ({
      ...row,
      review_date: ensureDateString(row.review_date),
      calculated_friday: ensureDateString(row.calculated_friday),
      conditional_fields: row.conditional_fields
        ? typeof row.conditional_fields === "string"
          ? JSON.parse(row.conditional_fields)
          : row.conditional_fields
        : {},
    }))
    res.json(formattedData)
  } catch (err) {
    console.error("❌ Error fetching all workspace data:", err)
    res.status(500).json({ message: "Server Error", error: err.message })
  }
})

// === Get Single Workstream Entry by ID ===
app.get("/api/workspace_data/:id", async (req, res) => {
  const id = req.params.id
  try {
    const result = await pool.query(
      `
      SELECT 
        wd.*,
        ws.website_url
      FROM workspace_data wd
      LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
      WHERE wd.id = $1
    `,
      [id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found" })
    }
    const record = result.rows[0]
    const formattedRecord = {
      ...record,
      review_date: ensureDateString(record.review_date),
      calculated_friday: ensureDateString(record.calculated_friday),
      conditional_fields: record.conditional_fields
        ? typeof record.conditional_fields === "string"
          ? JSON.parse(record.conditional_fields)
          : record.conditional_fields
        : {},
    }
    res.json(formattedRecord)
  } catch (err) {
    console.error("❌ Error fetching workspace_data by ID:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// === Update Workstream Entry by ID ===
app.put(
  "/api/workspace_data/:id",
  (req, res, next) => {
    const contentType = req.get("Content-Type") || ""
    if (contentType.includes("multipart/form-data")) {
      upload.array("images", 10)(req, res, next)
    } else {
      next()
    }
  },
  async (req, res) => {
    const id = req.params.id
    console.log("🔄 Updating record ID:", id)
    try {
      let formData
      let newImageFiles = []
      let existingImages = []
      const contentType = req.get("Content-Type") || ""
      if (contentType.includes("multipart/form-data")) {
        formData = req.body
        if (req.files && req.files.length > 0) {
          newImageFiles = req.files.map((file) => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`,
          }))
        }
        if (formData.existing_images) {
          try {
            existingImages = JSON.parse(formData.existing_images)
          } catch (e) {
            console.error("Error parsing existing images:", e)
            existingImages = []
          }
        }
      } else {
        formData = req.body
        if (formData.images) {
          try {
            existingImages = typeof formData.images === "string" ? JSON.parse(formData.images) : formData.images
          } catch (e) {
            console.error("Error parsing images:", e)
            existingImages = []
          }
        }
      }

      const {
        // New fields
        fullName,
        registrationType,
        reviewStatus,
        reviewReason,
        reviewType,
        registrationPlatform,
        conditionalFields,
        // Existing fields
        accessibility,
        third_party_content,
        conditional_response,
        website_type,
        registration_site,
        comments,
        website_operator,
        owner_name,
        review_date,
        calculated_friday,
        review_month,
        review_year,
        review_traffic,
        website_source_id,
        website_url,
        aChecks,
      } = formData

      let finalWebsiteSourceId = website_source_id
      if (website_url && (!website_source_id || website_source_id === "")) {
        const existingUrl = await pool.query("SELECT id FROM website_sources WHERE website_url = $1", [website_url])
        if (existingUrl.rows.length > 0) {
          finalWebsiteSourceId = existingUrl.rows[0].id
        } else {
          const newUrl = await pool.query("INSERT INTO website_sources (website_url) VALUES ($1) RETURNING id", [
            website_url,
          ])
          finalWebsiteSourceId = newUrl.rows[0].id
        }
      }

      const finalReviewDate = ensureDateString(review_date)
      const finalCalculatedFriday = ensureDateString(calculated_friday) || getFridayOfWeek(finalReviewDate)
      const { month, year } = getMonthAndYear(finalReviewDate)
      const finalReviewMonth = review_month || month
      const finalReviewYear = review_year || year

      const allImages = [...existingImages, ...newImageFiles]
      const imagesJSON = safeJSONStringify(allImages, "[]")

      // Parse conditional fields - FIXED
      let parsedConditionalFields = {}
      if (conditionalFields) {
        try {
          parsedConditionalFields =
            typeof conditionalFields === "string" ? JSON.parse(conditionalFields) : conditionalFields
          console.log("🔄 Update - Parsed conditional fields:", parsedConditionalFields)
        } catch (e) {
          console.error("Error parsing conditionalFields:", e)
        }
      }

      const finalOwnerName = fullName || owner_name

      const updateQuery = `
      UPDATE workspace_data SET 
        registration_type = $1, review_status = $2, review_reason = $3, review_type = $4,
        registration_platform = $5, conditional_fields = $6::jsonb,
        accessibility = $7, third_party_content = $8, conditional_response = $9, website_type = $10,
        registration_site = $11, comments = $12, website_operator = $13, owner_name = $14,
        review_date = $15::date, calculated_friday = $16::date, review_month = $17, review_year = $18,
        review_traffic = $19, website_source_id = $20, a_checks = $21, images = $22
      WHERE id = $23
      RETURNING *
    `

      const updateValues = [
        registrationType,
        reviewStatus,
        reviewReason,
        reviewType,
        registrationPlatform,
        safeJSONStringify(parsedConditionalFields, "{}"), // Cast to JSONB
        accessibility,
        third_party_content,
        conditional_response,
        website_type,
        registration_site,
        comments,
        website_operator,
        finalOwnerName,
        finalReviewDate,
        finalCalculatedFriday,
        finalReviewMonth,
        finalReviewYear,
        review_traffic,
        finalWebsiteSourceId,
        aChecks || null,
        imagesJSON,
        id,
      ]

      const result = await pool.query(updateQuery, updateValues)

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Record not found" })
      }

      const updatedRecord = await pool.query(
        `SELECT wd.*, ws.website_url FROM workspace_data wd
       LEFT JOIN website_sources ws ON wd.website_source_id = ws.id
       WHERE wd.id = $1`,
        [id],
      )

      const formattedUpdatedRecord = {
        ...updatedRecord.rows[0],
        review_date: ensureDateString(updatedRecord.rows[0].review_date),
        calculated_friday: ensureDateString(updatedRecord.rows[0].calculated_friday),
        conditional_fields: updatedRecord.rows[0].conditional_fields
          ? typeof updatedRecord.rows[0].conditional_fields === "string"
            ? JSON.parse(updatedRecord.rows[0].conditional_fields)
            : updatedRecord.rows[0].conditional_fields
          : {},
      }

      console.log("✅ Update successful")
      res.json({
        message: "Record updated successfully",
        data: formattedUpdatedRecord,
      })
    } catch (err) {
      console.error("❌ Error updating workspace_data:", err)
      if (req.files) {
        req.files.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file:", err)
          })
        })
      }
      res.status(500).json({ message: "Server error", error: err.message })
    }
  },
)

// === Delete Workstream Entry by ID ===
app.delete("/api/workspace_data/:id", async (req, res) => {
  const id = req.params.id
  try {
    const existingRecord = await pool.query("SELECT images FROM workspace_data WHERE id = $1", [id])
    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ message: "Record not found" })
    }
    const record = existingRecord.rows[0]
    if (record.images) {
      try {
        const images = typeof record.images === "string" ? JSON.parse(record.images) : record.images
        if (Array.isArray(images)) {
          images.forEach((image) => {
            if (image.filename) {
              const filePath = path.join(__dirname, "uploads", image.filename)
              fs.unlink(filePath, (err) => {
                if (err) console.error("❌ Error deleting image file:", err)
              })
            }
          })
        }
      } catch (parseError) {
        console.error("❌ Error parsing images for cleanup:", parseError)
      }
    }
    const deleteResult = await pool.query("DELETE FROM workspace_data WHERE id = $1 RETURNING id", [id])
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: "Record not found" })
    }
    res.json({ message: "Record deleted successfully", deletedId: id })
  } catch (err) {
    console.error("❌ Error deleting workspace_data:", err)
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// === Error handling ===
app.use((error, req, res, next) => {
  console.error("❌ Unhandled error:", error)
  res.status(500).json({
    success: false,
    message: "Internal server error",
  })
})

// === 404 handler ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  })
})


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`)
  console.log(`🔐 Auth test: http://localhost:${port}/api/auth/test`)
  console.log(`👤 User permissions: http://localhost:${port}/api/auth/permissions`)
  console.log("📋 ACL-Protected Routes:")
  console.log("  GET  /api/admin/users - Admin only (users:read)")
  console.log("  POST /api/admin/users - Admin only (users:create)")
  console.log("  DELETE /api/admin/users/:id - Admin only (users:delete)")
  console.log("  GET  /api/workstream - Read workstream (workstream:read)")
  console.log("  POST /api/workstream - Create workstream (workstream:create)")
  console.log("  GET  /api/dashboard/admin - Admin dashboard (dashboard:admin-view)")
  console.log("  GET  /api/dashboard/viewer - Viewer dashboard (dashboard:viewer-view)")
  console.log("📋 Workstream Routes:")
  console.log("  GET  /api/open/workstream - Get workstream1 data")
  console.log("  GET  /api/open/workstream/:workstreamId - Get specific workstream data")
  console.log("  POST /api/open/workstream-list - Add new workstream")
  console.log("  GET  /api/open/workstream-list - Get all workstreams")
  console.log("📋 Dynamic Field Configuration:")
  console.log("  GET  /api/admin/workstream/:workstreamId/field-config - Get field config")
  console.log("  PUT  /api/admin/workstream/:workstreamId/field-config/:fieldName - Update field config")
  console.log("  PUT  /api/admin/workstream/:workstreamId/field-config/toggle - Toggle field config")
  console.log("  GET  /api/fields/:workstreamId - Get active fields")
  console.log("  GET  /api/debug/workstream2-fields - Debug workstream2 fields")
})
