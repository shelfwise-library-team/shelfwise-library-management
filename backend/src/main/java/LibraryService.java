import java.sql.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Business logic. Issue/return use TRANSACTIONS (commit / rollback). */
public class LibraryService {
    private static final int LOAN_DAYS = 14;
    private final Connection conn;
    private final MemberDAO members;
    private final BookDAO books;

    public LibraryService(Connection conn) {
        this.conn = conn;
        this.members = new MemberDAO(conn);
        this.books = new BookDAO(conn);
    }

    public void issueBook(int memberId, int bookId) throws SQLException, LibraryException {
        conn.setAutoCommit(false);
        try {
            Member m = members.findById(memberId);
            if (m == null) throw new LibraryException("Member not found.");
            Book b = books.findById(bookId);
            if (b == null) throw new LibraryException("Book not found.");
            if (b.getCopies() <= 0) throw new LibraryException("No copies available.");

            int active = 0;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COUNT(*) FROM issues WHERE member_id=? AND return_date IS NULL")) {
                ps.setInt(1, memberId);
                ResultSet rs = ps.executeQuery();
                if (rs.next()) active = rs.getInt(1);
            }
            if (active >= m.getMaxBooks())
                throw new LibraryException(m.getType() + " limit of " + m.getMaxBooks() + " books reached.");

            LocalDate today = LocalDate.now();
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO issues(member_id, book_id, issue_date, due_date) VALUES (?,?,?,?)")) {
                ps.setInt(1, memberId);
                ps.setInt(2, bookId);
                ps.setString(3, today.toString());
                ps.setString(4, today.plusDays(LOAN_DAYS).toString());
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE books SET copies = copies - 1 WHERE id=?")) {
                ps.setInt(1, bookId);
                ps.executeUpdate();
            }
            conn.commit();
        } catch (SQLException | LibraryException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
        }
    }

    /** Returns the fine charged (0 if on time). */
    public double returnBook(int issueId) throws SQLException, LibraryException {
        conn.setAutoCommit(false);
        try {
            int memberId, bookId;
            LocalDate due;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT member_id, book_id, due_date FROM issues WHERE id=? AND return_date IS NULL")) {
                ps.setInt(1, issueId);
                ResultSet rs = ps.executeQuery();
                if (!rs.next()) throw new LibraryException("No active issue with that ID.");
                memberId = rs.getInt("member_id");
                bookId = rs.getInt("book_id");
                due = LocalDate.parse(rs.getString("due_date"));
            }
            Member m = members.findById(memberId);
            long late = Math.max(0, ChronoUnit.DAYS.between(due, LocalDate.now()));
            double fine = late * m.getFinePerDay();       // polymorphism decides the rate

            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE issues SET return_date=?, fine=? WHERE id=?")) {
                ps.setString(1, LocalDate.now().toString());
                ps.setDouble(2, fine);
                ps.setInt(3, issueId);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE books SET copies = copies + 1 WHERE id=?")) {
                ps.setInt(1, bookId);
                ps.executeUpdate();
            }
            conn.commit();
            return fine;
        } catch (SQLException | LibraryException e) {
            conn.rollback();
            throw e;
        } finally {
            conn.setAutoCommit(true);
        }
    }

    /** Report using a 3-table JOIN. */
    public void printActiveIssues() throws SQLException {
        String sql = "SELECT i.id, m.name, m.type, b.title, i.issue_date, i.due_date "
                   + "FROM issues i JOIN members m ON i.member_id = m.id "
                   + "JOIN books b ON i.book_id = b.id "
                   + "WHERE i.return_date IS NULL ORDER BY i.due_date";
        try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            System.out.printf("%-6s %-15s %-8s %-28s %-11s %-11s%n",
                    "IssueID", "Member", "Type", "Book", "Issued", "Due");
            boolean any = false;
            while (rs.next()) {
                any = true;
                System.out.printf("%-6d %-15s %-8s %-28s %-11s %-11s%n",
                        rs.getInt(1), rs.getString(2), rs.getString(3),
                        rs.getString(4), rs.getString(5), rs.getString(6));
            }
            if (!any) System.out.println("No books currently issued.");
        }
    }

    /** Aggregate query: GROUP BY + COUNT. */
    public void printPopularBooks() throws SQLException {
        String sql = "SELECT b.title, COUNT(i.id) AS times FROM books b "
                   + "LEFT JOIN issues i ON b.id = i.book_id "
                   + "GROUP BY b.id ORDER BY times DESC";
        try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next())
                System.out.printf("%-30s issued %d time(s)%n", rs.getString(1), rs.getInt(2));
        }
    }

    public MemberDAO members() { return members; }
    public BookDAO books()     { return books; }
}
