import java.sql.Connection;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        try (Connection conn = DBConnection.getConnection(); Scanner sc = new Scanner(System.in)) {
            DBConnection.initSchema(conn);
            LibraryService lib = new LibraryService(conn);

            while (true) {
                System.out.println("\n===== LIBRARY MANAGEMENT SYSTEM =====");
                System.out.println("1. Add book           2. List books        3. Search books");
                System.out.println("4. Add member         5. List members");
                System.out.println("6. Issue book         7. Return book       8. Active issues");
                System.out.println("9. Popular books      0. Exit");
                System.out.print("Choice: ");
                String choice = sc.nextLine().trim();

                try {
                    switch (choice) {
                        case "1" -> {
                            System.out.print("Title: ");  String t = sc.nextLine();
                            System.out.print("Author: "); String a = sc.nextLine();
                            System.out.print("Copies: "); int c = Integer.parseInt(sc.nextLine());
                            lib.books().add(new Book(0, t, a, c));
                            System.out.println("Book added.");
                        }
                        case "2" -> lib.books().findAll().forEach(System.out::println);
                        case "3" -> {
                            System.out.print("Keyword: ");
                            lib.books().search(sc.nextLine()).forEach(System.out::println);
                        }
                        case "4" -> {
                            System.out.print("Name: ");  String n = sc.nextLine();
                            System.out.print("Email: "); String e = sc.nextLine();
                            System.out.print("Type (1=Student, 2=Faculty): ");
                            Member m = sc.nextLine().equals("2") ? new Faculty(0, n, e) : new Student(0, n, e);
                            lib.members().add(m);
                            System.out.println(m.getType() + " added.");
                        }
                        case "5" -> lib.members().findAll().forEach(System.out::println);
                        case "6" -> {
                            System.out.print("Member ID: "); int m = Integer.parseInt(sc.nextLine());
                            System.out.print("Book ID: ");   int b = Integer.parseInt(sc.nextLine());
                            lib.issueBook(m, b);
                            System.out.println("Book issued. Due in 14 days.");
                        }
                        case "7" -> {
                            System.out.print("Issue ID: ");
                            double fine = lib.returnBook(Integer.parseInt(sc.nextLine()));
                            System.out.println(fine > 0 ? "Returned late. Fine: Rs." + fine : "Returned on time.");
                        }
                        case "8" -> lib.printActiveIssues();
                        case "9" -> lib.printPopularBooks();
                        case "0" -> { System.out.println("Goodbye!"); return; }
                        default  -> System.out.println("Invalid choice.");
                    }
                } catch (LibraryException e) {
                    System.out.println("Cannot complete: " + e.getMessage());
                } catch (NumberFormatException e) {
                    System.out.println("Please enter a valid number.");
                } catch (java.sql.SQLException e) {
                    System.out.println("Database error: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.out.println("Fatal error: " + e.getMessage());
        }
    }
}
