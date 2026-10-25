/** INHERITANCE: Faculty is-a Member with relaxed borrowing limits. */
public class Faculty extends Member {
    public Faculty(int id, String name, String email) { super(id, name, email); }
    public Faculty(int id, String name, String email, String department, String yearOfStudy,
                   String registerNumber, String phone, String designation) {
        super(id, name, email, department, yearOfStudy, registerNumber, phone, designation);
    }
    @Override public int getMaxBooks() { return 10; }
    @Override public double getFinePerDay() { return 100.0; }
    @Override public String getType() { return "FACULTY"; }
}
