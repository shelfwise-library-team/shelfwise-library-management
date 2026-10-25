/** Plain entity class (ENCAPSULATION via private fields + getters). */
public class Book {
    private final int id;
    private final String title;
    private final String author;
    private final int copies;

    public Book(int id, String title, String author, int copies) {
        this.id = id; this.title = title; this.author = author; this.copies = copies;
    }
    public int getId()        { return id; }
    public String getTitle()  { return title; }
    public String getAuthor() { return author; }
    public int getCopies()    { return copies; }

    @Override
    public String toString() {
        return String.format("[%d] %-30s %-20s copies: %d", id, title, author, copies);
    }
}
