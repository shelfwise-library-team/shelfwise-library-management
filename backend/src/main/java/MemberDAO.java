import java.sql.*;
import java.util.*;

/** Data-access object for library members. */
public class MemberDAO implements Dao<Member> {
    private final Connection conn;
    public MemberDAO(Connection conn) { this.conn = conn; }

    @Override
    public void add(Member m) throws SQLException {
        String sql = "INSERT INTO members(name,email,type,department,year_of_study,register_number,phone,designation) VALUES (?,?,?,?,?,?,?,?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, m.getName());
            ps.setString(2, m.getEmail());
            ps.setString(3, m.getType());
            ps.setString(4, m.getDepartment());
            ps.setString(5, m.getYearOfStudy());
            ps.setString(6, m.getRegisterNumber());
            ps.setString(7, m.getPhone());
            ps.setString(8, m.getDesignation());
            ps.executeUpdate();
        }
    }

    @Override
    public Member findById(int id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT * FROM members WHERE id=?")) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) { return rs.next() ? map(rs) : null; }
        }
    }

    @Override
    public List<Member> findAll() throws SQLException {
        List<Member> list = new ArrayList<>();
        try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery("SELECT * FROM members ORDER BY id")) {
            while (rs.next()) list.add(map(rs));
        }
        return list;
    }

    /** Factory: a database row becomes the correct Student or Faculty subclass. */
    private Member map(ResultSet rs) throws SQLException {
        int id = rs.getInt("id");
        String name = rs.getString("name"), email = rs.getString("email");
        String department = value(rs, "department");
        String year = value(rs, "year_of_study");
        String registerNumber = value(rs, "register_number");
        String phone = value(rs, "phone");
        String designation = value(rs, "designation");
        if ("FACULTY".equals(rs.getString("type")))
            return new Faculty(id, name, email, department, year, registerNumber, phone, designation);
        return new Student(id, name, email, department, year, registerNumber, phone, designation);
    }

    private static String value(ResultSet rs, String column) throws SQLException {
        String value = rs.getString(column);
        return value == null ? "" : value;
    }
}
