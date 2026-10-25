# Library Management System — 5-minute review notes

## 1. One-sentence project explanation

“Our Library Management System uses a React frontend, a Java API, JDBC, and an SQLite database. It manages books and members, issues and returns books, applies borrowing limits and late fines, and shows live library statistics.”

## 2. What each part does

- **React (`frontend/src/App.jsx`)**: shows the dashboard, book list, member list, circulation table, and forms. It sends HTTP requests to the Java backend.
- **Java API (`ApiServer.java`)**: receives JSON requests from React and calls the existing Java DAO/service methods.
- **`LibraryService.java`**: applies the business rules when books are issued or returned, including loan limits, the 14-day due date, fine calculation, and database transactions.
- **DAO classes (`BookDAO.java`, `MemberDAO.java`)**: run SQL queries using JDBC prepared statements.
- **`DBConnection.java`**: opens connections to SQLite and creates the tables from `schema.sql` on startup.
- **`library.db`**: the local database file created after starting the backend. It is stored in the `backend` directory.

## 3. Database tables

- **`books`** — book ID (primary key), title, author, and number of copies.
- **`members`** — member ID (primary key), name, unique email, and member type (`STUDENT` or `FACULTY`).
- **`issues`** — issue ID (primary key), member ID, book ID, issue date, due date, return date, and fine.

`issues.member_id` references `members.id`, and `issues.book_id` references `books.id`. These are foreign keys. The foreign keys stop an issue from referring to a non-existent member or book.

## 4. Java/OOP concepts in this code

- **Abstraction:** `Member` is an abstract class defining common member fields and abstract rule methods.
- **Inheritance:** `Student` and `Faculty` extend `Member`.
- **Polymorphism:** both subclasses override `getMaxBooks()`, `getFinePerDay()`, and `getType()`. A student can borrow up to 3 books and has a ₹5/day fine; a faculty member can borrow up to 10 books and has a ₹2/day fine.
- **Encapsulation:** fields in `Book` and `Member` are private and accessed with getters.
- **Interface and generics:** `Dao<T>` defines common data-access methods; `BookDAO` and `MemberDAO` implement it.
- **Exception handling:** `LibraryException` represents business-rule errors; SQL and invalid-number errors are handled separately in the console application.

## 5. DBMS concepts in this code

- **Primary key + auto-increment:** unique row IDs.
- **Foreign key:** relationship from issues to members and books.
- **Constraints:** `NOT NULL`, `UNIQUE` email, allowed member type, and non-negative book copies.
- **Prepared statements:** parameterized SQL for adding and finding books/members.
- **JOIN:** active issues combine issue, member, and book details into one table.
- **GROUP BY + COUNT:** the popular-books report counts how often books have been issued.
- **Transactions:** issue and return operations use `commit()` and `rollback()` so the issue row and available-copy count are updated together.

## 6. Example flow to explain to the reviewer

**Issue a book:** The user chooses a member and book in the UI. React sends the IDs to the Java API. `LibraryService.issueBook()` checks the member, book, available copies, and member's borrowing limit. It inserts an issue row, decreases the available copies by one, and commits the transaction. If validation or SQL fails, it rolls back.

**Return a book:** The service finds the active loan, calculates how many days late it is, uses the member type to calculate the fine, updates the issue's return date and fine, increases the available copies by one, and commits.

## 7. If the reviewer asks why React and Java are separate

“React is responsible for presentation and user interaction. Java handles the business rules and database work. They communicate through HTTP requests with JSON. React cannot safely connect directly to the local SQLite database in the browser.”

## 8. Demo order

1. Overview dashboard.
2. Add a book; show it in Books.
3. Register a student or faculty member; show it in Members.
4. Issue the book; show the available count decrease and the loan appear in Circulation.
5. Return the book; show the copy count go up.
6. Mention the 14-day loan period, member-specific limit/fine, foreign keys, and transaction rollback.

**Be accurate:** this starter version uses **SQLite**, not MySQL. Do not claim login/authentication, book editing/deletion, or production deployment as implemented features.
