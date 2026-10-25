/** INHERITANCE: Student is-a Member with stricter borrowing limits. */
public class Student extends Member {
    public Student(int id, String name, String email) { super(id, name, email); }
    public Student(int id, String name, String email, String department, String yearOfStudy,
                   String registerNumber, String phone, String designation) {
        super(id, name, email, department, yearOfStudy, registerNumber, phone, designation);
    }
    @Override public int getMaxBooks() { return 3; }
    @Override public double getFinePerDay() { return 20.0; }
    @Override public String getType() { return "STUDENT"; }
}
