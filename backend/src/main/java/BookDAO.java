import java.sql.*;
import java.util.*;

public class BookDAO implements Dao<Book> {
    private final Connection conn;
    public BookDAO(Connection conn) { this.conn = conn; }

    @Override
    public void add(Book b) throws SQLException {
        String sql = "INSERT INTO books(title, author, copies) VALUES (?,?,?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, b.getTitle());
            ps.setString(2, b.getAuthor());
            ps.setInt(3, b.getCopies());
            ps.executeUpdate();
        }
    }

    @Override
    public Book findById(int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM books WHERE id=?")) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            return rs.next() ? map(rs) : null;
        }
    }

    @Override
    public List<Book> findAll() throws SQLException {
        List<Book> list = new ArrayList<>();
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT * FROM books ORDER BY id")) {
            while (rs.next()) list.add(map(rs));
        }
        return list;
    }

    /** SQL LIKE search on title or author. */
    public List<Book> search(String keyword) throws SQLException {
        List<Book> list = new ArrayList<>();
        String sql = "SELECT * FROM books WHERE title LIKE ? OR author LIKE ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, "%" + keyword + "%");
            ps.setString(2, "%" + keyword + "%");
            ResultSet rs = ps.executeQuery();
            while (rs.next()) list.add(map(rs));
        }
        return list;
    }

    private Book map(ResultSet rs) throws SQLException {
        return new Book(rs.getInt("id"), rs.getString("title"),
                        rs.getString("author"), rs.getInt("copies"));
    }
}
