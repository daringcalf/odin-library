const myLibrary = [];

const readStatus = {
  AVAILABLE: "Available",
  READING: "Reading",
  FINISHED: "Finished",
};

function generateUniqueId() {
  return crypto.randomUUID();
}

function Book(
  title,
  author,
  yearPublished,
  status = readStatus.AVAILABLE,
  cover = null
) {
  if (!new.target) {
    throw new Error("Book constructor must be called with 'new'.");
  }

  if (!title || !author) {
    throw new Error("Title and author are required fields.");
  }

  this.id = generateUniqueId();
  this.title = title;
  this.author = author;
  this.readStatus = status;
  this.yearPublished = yearPublished;
  this.cover = cover;
}

Book.prototype.toggleStatus = function () {
  if (this.readStatus === readStatus.AVAILABLE) {
    this.readStatus = readStatus.READING;
  } else if (this.readStatus === readStatus.READING) {
    this.readStatus = readStatus.FINISHED;
  } else {
    this.readStatus = readStatus.AVAILABLE;
  }
};

function addBookToLibrary(
  title,
  author,
  yearPublished,
  status = readStatus.AVAILABLE,
  cover = null
) {
  const book = new Book(title, author, yearPublished, status, cover);
  myLibrary.push(book);
}

function addSampleBooks() {
  addBookToLibrary(
    "The Hobbit",
    "J.R.R. Tolkien",
    1937,
    readStatus.AVAILABLE,
    "https://covers.openlibrary.org/b/id/14627222-L.jpg"
  );
  addBookToLibrary(
    "1984",
    "George Orwell",
    1949,
    readStatus.AVAILABLE,
    "https://covers.openlibrary.org/b/id/14845126-L.jpg"
  );
  addBookToLibrary(
    "To Kill a Mockingbird",
    "Harper Lee",
    1960,
    readStatus.AVAILABLE,
    "https://covers.openlibrary.org/b/id/14856323-L.jpg"
  );
  addBookToLibrary(
    "The Great Gatsby",
    "F. Scott Fitzgerald",
    1925,
    readStatus.READING,
    "https://covers.openlibrary.org/b/id/12364437-L.jpg"
  );
  addBookToLibrary(
    "Moby Dick",
    "Herman Melville",
    1851,
    readStatus.READING,
    "https://ia800100.us.archive.org/view_archive.php?archive=/5/items/l_covers_0012/l_covers_0012_62.zip&file=0012621992-L.jpg"
  );
  addBookToLibrary(
    "The Language Instinct",
    "Steven Pinker",
    1994,
    readStatus.FINISHED,
    "https://covers.openlibrary.org/b/id/6624418-L.jpg"
  );
  addBookToLibrary(
    "Pride and Prejudice",
    "Jane Austen",
    1813,
    readStatus.FINISHED,
    "https://ia800505.us.archive.org/view_archive.php?archive=/35/items/l_covers_0014/l_covers_0014_60.zip&file=0014601367-L.jpg"
  );
}

function displayBooks() {
  availableBooks = myLibrary.filter(
    (book) => book.readStatus === readStatus.AVAILABLE
  );
  readingBooks = myLibrary.filter(
    (book) => book.readStatus === readStatus.READING
  );
  readBooks = myLibrary.filter(
    (book) => book.readStatus === readStatus.FINISHED
  );

  availableBooksList = document.querySelector("#available-books .book-list");
  readingBooksList = document.querySelector("#reading-books .book-list");
  readBooksList = document.querySelector("#finished-books .book-list");
  availableBooksList.innerHTML = "";
  readingBooksList.innerHTML = "";
  readBooksList.innerHTML = "";

  availableBooks.forEach((book) => {
    // console.log(book.title);
    const bookCard = createBookCard(book);
    availableBooksList.appendChild(bookCard);
  });
  readingBooks.forEach((book) => {
    const bookCard = createBookCard(book);
    readingBooksList.appendChild(bookCard);
  });
  readBooks.forEach((book) => {
    const bookCard = createBookCard(book);
    readBooksList.appendChild(bookCard);
  });
}

function createBookCard(book) {
  const bookCard = document.createElement("div");
  bookCard.className = "book-card";
  bookCard.dataset.bookId = book.id;

  const coverDiv = document.createElement("div");
  // if cover is provided, use it; otherwise, use a placeholder div
  if (book.cover) {
    const coverImage = document.createElement("img");
    coverImage.src = book.cover;
    coverImage.alt = `${book.title} cover image`;
    coverImage.className = "book-cover-image";
    coverDiv.appendChild(coverImage);
  } else {
    const coverText = document.createElement("div");
    const coverTextTitle = document.createElement("span");
    coverTextTitle.textContent = book.title;
    const coverTextAuthor = document.createElement("span");
    coverTextAuthor.textContent = `by ${book.author}`;
    coverText.appendChild(coverTextTitle);
    coverText.appendChild(coverTextAuthor);
    coverDiv.appendChild(coverText);
    coverText.className = "book-cover-placeholder";
    coverTextTitle.className = "book-cover-title";
    coverTextAuthor.className = "book-cover-author";
  }
  coverDiv.className = "book-cover";
  bookCard.appendChild(coverDiv);

  const title = document.createElement("h3");
  title.className = "book-title";
  title.textContent = book.title;

  const author = document.createElement("p");
  author.className = "book-author";
  author.textContent = `by ${book.author}`;

  const details = document.createElement("div");
  details.className = "book-details";

  const year = document.createElement("span");
  year.className = "book-year";
  year.textContent = book.yearPublished;

  const status = document.createElement("div");
  status.className = "book-status";
  status.textContent = book.readStatus;

  details.appendChild(year);

  bookCard.appendChild(title);
  bookCard.appendChild(author);
  bookCard.appendChild(details);
  bookCard.appendChild(status);

  return bookCard;
}

function init() {
  addSampleBooks();
  displayBooks();
}

document.addEventListener("DOMContentLoaded", init);

const dialog = document.querySelector("dialog");
const addBookToLibraryButton = document.querySelector("#add-book-btn");
const form = document.querySelector("form");
const cancelButton = document.querySelector("#cancel-btn");

cancelButton.addEventListener("click", (e) => {
  e.preventDefault();
  dialog.close();
});

addBookToLibraryButton.addEventListener("click", () => {
  dialog.showModal();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);

  const title = formData.get("title");
  const author = formData.get("author");
  const yearPublished = parseInt(formData.get("year-published"), 10);
  const status = formData.get("status");
  const cover = formData.get("cover");

  try {
    addBookToLibrary(title, author, yearPublished, status, cover);

    // console.log(
    //   `Added book: ${title} by ${author}, published in ${yearPublished}, status: ${status}`
    // );
    // console.log(myLibrary);

    form.reset();
    dialog.close();
    displayBooks();
  } catch (error) {
    alert(error.message);
  }
});
