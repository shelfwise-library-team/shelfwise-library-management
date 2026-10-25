import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/** Handles the JDBC connection and loads schema.sql from the classpath. */
public class DBConnection {
    private static final String URL = "jdbc:sqlite:library.db";

    public static Connection getConnection() throws SQLException {
        Connection conn = DriverManager.getConnection(URL);
        try (Statement st = conn.createStatement()) {
            st.execute("PRAGMA foreign_keys = ON");
        }
        return conn;
    }

    public static void initSchema(Connection conn) throws SQLException, IOException {
        String sql;
        try (InputStream in = DBConnection.class.getResourceAsStream("/schema.sql")) {
            if (in == null) {
                throw new IOException("schema.sql was not found in the application's resources.");
            }
            sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        try (Statement st = conn.createStatement()) {
            for (String stmt : sql.split(";")) {
                if (!stmt.trim().isEmpty()) st.execute(stmt);
            }
        }
        // Safe, additive migration for library.db files created before the member-profile fields existed.
        ensureColumn(conn, "department", "TEXT NOT NULL DEFAULT ''");
        ensureColumn(conn, "year_of_study", "TEXT NOT NULL DEFAULT ''");
        ensureColumn(conn, "register_number", "TEXT NOT NULL DEFAULT ''");
        ensureColumn(conn, "phone", "TEXT NOT NULL DEFAULT ''");
        ensureColumn(conn, "designation", "TEXT NOT NULL DEFAULT ''");
    }

    private static void ensureColumn(Connection conn, String column, String definition) throws SQLException {
        boolean found = false;
        try (Statement st = conn.createStatement(); java.sql.ResultSet rs = st.executeQuery("PRAGMA table_info(members)")) {
            while (rs.next()) if (column.equalsIgnoreCase(rs.getString("name"))) { found = true; break; }
        }
        if (!found) {
            try (Statement st = conn.createStatement()) {
                st.execute("ALTER TABLE members ADD COLUMN " + column + " " + definition);
            }
        }
    }
}
