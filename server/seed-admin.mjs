// Seed script to create default admin user
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

async function seedAdmin() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);

  try {
    // Check if admin exists
    const [rows] = await connection.execute(
      "SELECT id FROM users WHERE username = ?",
      ["admin"]
    );

    if (rows.length > 0) {
      console.log("Admin user already exists, skipping seed.");
      return;
    }

    const passwordHash = await bcrypt.hash("admin123", 12);
    const openId = `local_admin_${Date.now()}`;

    await connection.execute(
      `INSERT INTO users (openId, username, passwordHash, name, role, loginMethod, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [openId, "admin", passwordHash, "مدير النظام", "admin", "local"]
    );

    console.log("Admin user created successfully!");
    console.log("Username: admin");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error seeding admin:", error);
  } finally {
    await connection.end();
  }
}

seedAdmin();
