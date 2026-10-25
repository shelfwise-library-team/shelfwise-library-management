import java.sql.SQLException;
import java.util.List;

/** INTERFACE + GENERICS: contract every data-access class must follow. */
public interface Dao<T> {
    void add(T item) throws SQLException;
    T findById(int id) throws SQLException;
    List<T> findAll() throws SQLException;
}
