const express = require('express');
const mysql = require('mysql');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// MySQL database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Samsa_220015',
    database: 'aitu'
});

// Telegram Bot setup
const token = '1224454686:AAE8o_r-X6TL8GOgosKoQHsIxwM8xEhTZhA';
const bot = new TelegramBot(token, { polling: false });

const chatId = '-1002101035816';



connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL database as id ' + connection.threadId);
});

// Middleware to parse JSON requests
app.use(express.json());

// Route to create a new book record
app.post('/api/books', (req, res) => {
  const { Name, Author, Genres, PagesCount, Price, PublishYear } = req.body;

  const sql = 'INSERT INTO books (Name, Author, Genres, PagesCount, Price, PublishYear) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(sql, [Name, Author, Genres, PagesCount, Price, PublishYear], (error, results, fields) => {
    if (error) {
      console.error('Error creating book record: ' + error.stack);
      res.status(500).json({ error: 'Error creating book record' });
      return;
    }

    // We are sending a notification to Telegram about the addition of a new book
    const message = `New book added: ${Name}`;
    const chatId = '-1002101035816';
    bot.sendMessage(chatId, message)
      .then(() => {
        console.log('Notification sent to Telegram');
      })
      .catch((telegramError) => {
        console.error('Error sending notification to Telegram:', telegramError);
      });

    res.status(201).json({ message: 'Book created successfully' });
  });
});



// Route to retrieve all books
app.get('/api/books', (req, res) => {
    const sql = 'SELECT * FROM books';
    connection.query(sql, (error, results, fields) => {
        if (error) {
            console.error('Error retrieving books: ' + error.stack);
            res.status(500).json({ error: 'Error retrieving books' });
            return;
        }
        res.json(results);
    });
});

// Route to retrieve books by author ID with LEFT JOIN
app.get('/api/author/:id/booksgi', (req, res) => {
    const authorId = req.params.id;
    const sql = 'SELECT b.Name, b.PagesCount, b.Price, b.PublishYear FROM books b LEFT JOIN Author a ON b.Author = a.id WHERE a.id = ?';
    connection.query(sql, [authorId], (error, results, fields) => {
        if (error) {
            console.error('Error retrieving books by author: ' + error.stack);
            res.status(500).json({ error: 'Error retrieving books by author' });
            return;
        }
        res.json(results);
    });
});

// Route to retrieve books by genre ID with LEFT JOIN
app.get('/api/genre/:id/books', (req, res) => {
    const genreId = req.params.id;
    const sql = 'SELECT b.Name, b.PagesCount, b.Price, b.PublishYear FROM books b LEFT JOIN Genres g ON b.Genres = g.id WHERE g.id = ?';
    connection.query(sql, [genreId], (error, results, fields) => {
        if (error) {
            console.error('Error retrieving books by genre: ' + error.stack);
            res.status(500).json({ error: 'Error retrieving books by genre' });
            return;
        }
        res.json(results);
    });
});


// Route to update a book record
app.put('/api/books/:id', (req, res) => {
    const id = req.params.id;
    const { Name, Author, Genres, PagesCount, Price, PublishYear } = req.body;

    const sql = 'UPDATE books SET title=?, author_id=?, genre_id=?, pages_count=?, price=?, publish_year=? WHERE id=?';
    connection.query(sql, [Name, Author, Genres, PagesCount, Price, PublishYear, id], (error, results, fields) => {
        if (error) {
            console.error('Error updating book record: ' + error.stack);
            res.status(500).json({ error: 'Error updating book record' });
            return;
        }
        res.json({ message: 'Book updated successfully' });
    });
});


// Route to delete a book record
app.delete('/api/books/:id', (req, res) => {
    const id = req.params.id;

    // First, retrieve the book details before deletion
    const selectSql = 'SELECT Name, Author, Genres, PagesCount, Price, PublishYear FROM books WHERE id=?';
    connection.query(selectSql, [id], (selectError, selectResults, selectFields) => {
        if (selectError) {
            console.error('Error retrieving book details before deletion: ' + selectError.stack);
            res.status(500).json({ error: 'Error retrieving book details before deletion' });
            return;
        }

        // Store the book details for inclusion in the response
        const bookDetails = selectResults[0];

        // Perform the deletion
        const deleteSql = 'DELETE FROM books WHERE id=?';
        connection.query(deleteSql, [id], (deleteError, deleteResults, deleteFields) => {
            if (deleteError) {
                console.error('Error deleting book record: ' + deleteError.stack);
                res.status(500).json({ error: 'Error deleting book record' });
                return;
            }

            // Include the book details in the response
            res.json({ message: 'Book deleted successfully', deletedBook: bookDetails });
        });
    });
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);});
