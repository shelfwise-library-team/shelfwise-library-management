SHELFWISE EDIT + DELETE UPDATE

This update adds:
- Edit book title and author.
- Edit the number of AVAILABLE copies on the shelf.
- Delete books only when they have no issue/circulation history.
- Edit member name, email and membership type.
- Delete members only when they have no issue/circulation history.
- API validation to prevent deleting records that are referenced by loan history.

HOW TO APPLY WITHOUT LOSING YOUR CURRENT DATABASE
1. In VS Code, stop the Java backend terminal by pressing Ctrl+C.
2. Keep a backup copy of these current files if you want:
   backend/src/main/java/ApiServer.java
   frontend/src/App.jsx
   frontend/src/styles.css
3. Extract this ZIP directly into your existing project root, for example:
   D:\Projects\LibraryManagement
4. Allow Windows to merge the folders and replace the three files.
5. DO NOT delete or replace backend/library.db. This update ZIP does not contain your database.
6. In the backend terminal, run:
   mvn clean compile exec:java
   (If the terminal is at the project root first run: cd backend)
7. Keep the Java backend running. The React terminal should remain running too; Vite normally reloads the frontend automatically. Refresh http://localhost:5173 if necessary.

IMPORTANT COPY COUNT NOTE
The existing database field books.copies stores AVAILABLE copies currently on the shelf. Issuing a book reduces this value and returning a book increases it. The Edit Book form changes available stock, not a separate total-inventory count.

DELETE SAFETY
If a book/member has ever appeared in the issues table, the API prevents deletion so loan history and foreign-key relationships are preserved. The error message explains this. Edit those records instead.
