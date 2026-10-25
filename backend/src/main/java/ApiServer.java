import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Small REST API that lets the React frontend use the existing Java/SQLite service. */
public class ApiServer {
    private static final Gson GSON = new Gson();

    public static void main(String[] args) throws Exception {
        try (Connection conn = DBConnection.getConnection()) {
            DBConnection.initSchema(conn);
        }
        int port = Integer.parseInt(
            System.getenv().getOrDefault("PORT", "8080")
        );
        HttpServer server = 
        HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/api/", ApiServer::handle);
        server.setExecutor(null);
        server.start();
        System.out.println("Library API running at http://localhost:8080/api");
        System.out.println("Keep this terminal open while using the React frontend.");
    }

    private static void handle(HttpExchange ex) throws IOException {
        addCors(ex);
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
            ex.close();
            return;
        }
        try (Connection conn = DBConnection.getConnection()) {
            String method = ex.getRequestMethod().toUpperCase();
            String path = ex.getRequestURI().getPath().substring("/api".length());
            LibraryService lib = new LibraryService(conn);
            Object result;
            int status = 200;

            if ("GET".equals(method) && "/dashboard".equals(path)) {
                result = dashboard(conn);
            } else if ("GET".equals(method) && "/books".equals(path)) {
                String keyword = queryParameter(ex.getRequestURI().getRawQuery(), "search");
                List<Book> books = keyword == null || keyword.isBlank()
                        ? lib.books().findAll() : lib.books().search(keyword);
                result = books;
            } else if ("POST".equals(method) && "/books".equals(path)) {
                JsonObject body = body(ex);
                String title = requiredString(body, "title");
                String author = requiredString(body, "author");
                int copies = requiredInt(body, "copies");
                if (copies < 0) throw new IllegalArgumentException("Copies cannot be negative.");
                lib.books().add(new Book(0, title, author, copies));
                result = Map.of("message", "Book added successfully.");
                status = 201;
            } else if ("PUT".equals(method) && path.matches("/books/\\d+")) {
                int id = Integer.parseInt(path.substring("/books/".length()));
                JsonObject body = body(ex);
                String title = requiredString(body, "title");
                String author = requiredString(body, "author");
                int copies = requiredInt(body, "copies");
                if (copies < 0) throw new IllegalArgumentException("Available copies cannot be negative.");
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE books SET title=?, author=?, copies=? WHERE id=?")) {
                    ps.setString(1, title); ps.setString(2, author); ps.setInt(3, copies); ps.setInt(4, id);
                    if (ps.executeUpdate() == 0) throw new IllegalArgumentException("Book not found.");
                }
                result = Map.of("message", "Book updated successfully.");
            } else if ("DELETE".equals(method) && path.matches("/books/\\d+")) {
                int id = Integer.parseInt(path.substring("/books/".length()));
                if (countForId(conn, "SELECT COUNT(*) FROM issues WHERE book_id=?", id) > 0) {
                    throw new IllegalArgumentException("This book has circulation history and cannot be deleted. You can edit its details instead.");
                }
                try (PreparedStatement ps = conn.prepareStatement("DELETE FROM books WHERE id=?")) {
                    ps.setInt(1, id);
                    if (ps.executeUpdate() == 0) throw new IllegalArgumentException("Book not found.");
                }
                result = Map.of("message", "Book deleted successfully.");
            } else if ("GET".equals(method) && "/members".equals(path)) {
                List<Map<String, Object>> rows = new ArrayList<>();
                for (Member m : lib.members().findAll()) rows.add(memberMap(m));
                result = rows;
            } else if ("POST".equals(method) && "/members".equals(path)) {
                JsonObject body = body(ex);
                String name = requiredString(body, "name");
                String email = requiredString(body, "email");
                String type = requiredString(body, "type").toUpperCase();
                String department = requiredString(body, "department");
                String year = optionalString(body, "yearOfStudy");
                String registerNumber = optionalString(body, "registerNumber");
                String phone = optionalString(body, "phone");
                String designation = optionalString(body, "designation");
                if ("STUDENT".equals(type) && year.isBlank())
                    throw new IllegalArgumentException("Year of study is required for students.");
                Member member;
                if ("FACULTY".equals(type)) member = new Faculty(0, name, email, department, year, registerNumber, phone, designation);
                else if ("STUDENT".equals(type)) member = new Student(0, name, email, department, year, registerNumber, phone, designation);
                else throw new IllegalArgumentException("Member type must be STUDENT or FACULTY.");
                lib.members().add(member);
                result = Map.of("message", member.getType() + " member added successfully.");
                status = 201;
            } else if ("PUT".equals(method) && path.matches("/members/\\d+")) {
                int id = Integer.parseInt(path.substring("/members/".length()));
                JsonObject body = body(ex);
                String name = requiredString(body, "name");
                String email = requiredString(body, "email");
                String type = requiredString(body, "type").toUpperCase();
                String department = requiredString(body, "department");
                String year = optionalString(body, "yearOfStudy");
                String registerNumber = optionalString(body, "registerNumber");
                String phone = optionalString(body, "phone");
                String designation = optionalString(body, "designation");
                if (!"STUDENT".equals(type) && !"FACULTY".equals(type)) {
                    throw new IllegalArgumentException("Member type must be STUDENT or FACULTY.");
                }
                if ("STUDENT".equals(type) && year.isBlank())
                    throw new IllegalArgumentException("Year of study is required for students.");
                long activeLoans = countForId(conn,
                        "SELECT COUNT(*) FROM issues WHERE member_id=? AND return_date IS NULL", id);
                int newLimit = "FACULTY".equals(type) ? 10 : 3;
                if (activeLoans > newLimit) {
                    throw new IllegalArgumentException("This member currently has " + activeLoans
                            + " active loans. Return enough books before changing to this member type.");
                }
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE members SET name=?, email=?, type=?, department=?, year_of_study=?, register_number=?, phone=?, designation=? WHERE id=?")) {
                    ps.setString(1, name); ps.setString(2, email); ps.setString(3, type);
                    ps.setString(4, department); ps.setString(5, year); ps.setString(6, registerNumber);
                    ps.setString(7, phone); ps.setString(8, designation); ps.setInt(9, id);
                    if (ps.executeUpdate() == 0) throw new IllegalArgumentException("Member not found.");
                }
                result = Map.of("message", "Member updated successfully.");
            } else if ("DELETE".equals(method) && path.matches("/members/\\d+")) {
                int id = Integer.parseInt(path.substring("/members/".length()));
                if (countForId(conn, "SELECT COUNT(*) FROM issues WHERE member_id=?", id) > 0) {
                    throw new IllegalArgumentException("This member has circulation history and cannot be deleted. You can edit their details instead.");
                }
                try (PreparedStatement ps = conn.prepareStatement("DELETE FROM members WHERE id=?")) {
                    ps.setInt(1, id);
                    if (ps.executeUpdate() == 0) throw new IllegalArgumentException("Member not found.");
                }
                result = Map.of("message", "Member deleted successfully.");
            } else if ("GET".equals(method) && "/issues".equals(path)) {
                result = activeIssues(conn);
            } else if ("POST".equals(method) && "/issues".equals(path)) {
                JsonObject body = body(ex);
                lib.issueBook(requiredInt(body, "memberId"), requiredInt(body, "bookId"));
                result = Map.of("message", "Book issued. It is due in 14 days.");
                status = 201;
            } else if ("POST".equals(method) && path.matches("/issues/\\d+/return")) {
                String[] parts = path.split("/");
                int issueId = Integer.parseInt(parts[2]);
                double fine = lib.returnBook(issueId);
                result = Map.of("message", fine > 0 ? "Book returned with a fine." : "Book returned on time.", "fine", fine);
            } else if ("GET".equals(method) && "/health".equals(path)) {
                result = Map.of("status", "ok");
            } else {
                result = Map.of("error", "Endpoint not found.");
                status = 404;
            }
            send(ex, status, result);
        } catch (IllegalArgumentException e) {
            send(ex, 400, Map.of("error", safeMessage(e)));
        } catch (LibraryException e) {
            send(ex, 400, Map.of("error", safeMessage(e)));
        } catch (SQLException e) {
            String msg = safeMessage(e);
            if (msg.toLowerCase().contains("unique constraint")) msg = "That email is already registered.";
            send(ex, 400, Map.of("error", msg));
        } catch (Exception e) {
            e.printStackTrace();
            send(ex, 500, Map.of("error", "Server error: " + safeMessage(e)));
        }
    }

    private static Map<String, Object> dashboard(Connection c) throws SQLException {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalTitles", count(c, "SELECT COUNT(*) FROM books"));
        data.put("totalCopies", count(c, "SELECT COALESCE(SUM(copies),0) FROM books"));
        data.put("members", count(c, "SELECT COUNT(*) FROM members"));
        data.put("activeIssues", count(c, "SELECT COUNT(*) FROM issues WHERE return_date IS NULL"));
        data.put("overdue", count(c, "SELECT COUNT(*) FROM issues WHERE return_date IS NULL AND due_date < date('now')"));
        List<Map<String, Object>> popular = new ArrayList<>();
        String sql = "SELECT b.id, b.title, b.author, COUNT(i.id) AS issued " +
                     "FROM books b LEFT JOIN issues i ON i.book_id=b.id " +
                     "GROUP BY b.id ORDER BY issued DESC, b.title LIMIT 5";
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", rs.getInt("id")); row.put("title", rs.getString("title"));
                row.put("author", rs.getString("author")); row.put("issued", rs.getInt("issued"));
                popular.add(row);
            }
        }
        data.put("popularBooks", popular);
        return data;
    }

    private static long count(Connection c, String sql) throws SQLException {
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            return rs.next() ? rs.getLong(1) : 0;
        }
    }

    private static long countForId(Connection c, String sql, int id) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getLong(1) : 0;
            }
        }
    }

    private static List<Map<String, Object>> activeIssues(Connection c) throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        String sql = "SELECT i.id, i.member_id, i.book_id, m.name AS member_name, m.type AS member_type, " +
                     "b.title AS book_title, i.issue_date, i.due_date, i.return_date, i.fine " +
                     "FROM issues i JOIN members m ON m.id=i.member_id JOIN books b ON b.id=i.book_id " +
                     "WHERE i.return_date IS NULL ORDER BY i.due_date ASC, i.id DESC";
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", rs.getInt("id")); row.put("memberId", rs.getInt("member_id"));
                row.put("bookId", rs.getInt("book_id")); row.put("memberName", rs.getString("member_name"));
                row.put("memberType", rs.getString("member_type")); row.put("bookTitle", rs.getString("book_title"));
                row.put("issueDate", rs.getString("issue_date")); row.put("dueDate", rs.getString("due_date"));
                row.put("returnDate", rs.getString("return_date")); row.put("fine", rs.getDouble("fine"));
                rows.add(row);
            }
        }
        return rows;
    }

    private static Map<String, Object> memberMap(Member m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", m.getId()); row.put("name", m.getName()); row.put("email", m.getEmail());
        row.put("type", m.getType()); row.put("maxBooks", m.getMaxBooks()); row.put("finePerDay", m.getFinePerDay());
        row.put("department", m.getDepartment()); row.put("yearOfStudy", m.getYearOfStudy());
        row.put("registerNumber", m.getRegisterNumber()); row.put("phone", m.getPhone());
        row.put("designation", m.getDesignation());
        return row;
    }

    private static String optionalString(JsonObject obj, String key) {
        if (!obj.has(key) || obj.get(key).isJsonNull()) return "";
        return obj.get(key).getAsString().trim();
    }

    private static JsonObject body(HttpExchange ex) throws IOException {
        String raw = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        try { return JsonParser.parseString(raw).getAsJsonObject(); }
        catch (RuntimeException e) { throw new IllegalArgumentException("Please send valid JSON."); }
    }

    private static String requiredString(JsonObject obj, String key) {
        if (!obj.has(key) || obj.get(key).isJsonNull()) throw new IllegalArgumentException("Missing field: " + key);
        String value = obj.get(key).getAsString().trim();
        if (value.isEmpty()) throw new IllegalArgumentException(key + " cannot be empty.");
        return value;
    }

    private static int requiredInt(JsonObject obj, String key) {
        try {
            if (!obj.has(key) || obj.get(key).isJsonNull()) throw new NumberFormatException();
            return obj.get(key).getAsInt();
        } catch (RuntimeException e) { throw new IllegalArgumentException(key + " must be a whole number."); }
    }

    private static String queryParameter(String rawQuery, String key) {
        if (rawQuery == null) return null;
        for (String pair : rawQuery.split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length > 0 && key.equals(parts[0])) {
                return URLDecoder.decode(parts.length > 1 ? parts[1] : "", StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private static void addCors(HttpExchange ex) {
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static void send(HttpExchange ex, int status, Object value) throws IOException {
        byte[] out = GSON.toJson(value).getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, out.length);
        try (var stream = ex.getResponseBody()) { stream.write(out); }
    }

    private static String safeMessage(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
}
