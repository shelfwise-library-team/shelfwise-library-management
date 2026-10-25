/** ABSTRACTION + ENCAPSULATION: common base for all library members. */
public abstract class Member {
    private final int id;
    private final String name;
    private final String email;
    private final String department;
    private final String yearOfStudy;
    private final String registerNumber;
    private final String phone;
    private final String designation;

    protected Member(int id, String name, String email) {
        this(id, name, email, "", "", "", "", "");
    }

    protected Member(int id, String name, String email, String department,
                     String yearOfStudy, String registerNumber, String phone, String designation) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.department = clean(department);
        this.yearOfStudy = clean(yearOfStudy);
        this.registerNumber = clean(registerNumber);
        this.phone = clean(phone);
        this.designation = clean(designation);
    }

    private static String clean(String value) { return value == null ? "" : value.trim(); }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getDepartment() { return department; }
    public String getYearOfStudy() { return yearOfStudy; }
    public String getRegisterNumber() { return registerNumber; }
    public String getPhone() { return phone; }
    public String getDesignation() { return designation; }

    // Each subclass supplies its own rules (POLYMORPHISM).
    public abstract int getMaxBooks();
    public abstract double getFinePerDay();
    public abstract String getType();

    @Override
    public String toString() {
        return String.format("[%d] %-15s %-25s %-8s (max %d books, fine Rs.%.0f/day)",
                id, name, email, getType(), getMaxBooks(), getFinePerDay());
    }
}
