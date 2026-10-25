-- Library Management System database schema (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    type            TEXT NOT NULL CHECK (type IN ('STUDENT','FACULTY')),
    department      TEXT NOT NULL DEFAULT '',
    year_of_study   TEXT NOT NULL DEFAULT '',
    register_number TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    designation     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS books (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    title   TEXT NOT NULL,
    author  TEXT NOT NULL,
    copies  INTEGER NOT NULL CHECK (copies >= 0)
);

CREATE TABLE IF NOT EXISTS issues (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id    INTEGER NOT NULL,
    book_id      INTEGER NOT NULL,
    issue_date   TEXT NOT NULL,
    due_date     TEXT NOT NULL,
    return_date  TEXT,
    fine         REAL DEFAULT 0,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
);
