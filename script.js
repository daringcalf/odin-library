const myLibrary = [];

const readStatus = {
  AVAILABLE: "Available",
  READING: "Reading",
  FINISHED: "Finished",
};

// Color extraction and contrast calculation functions
function extractDominantColor(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const colorMap = {};

    // Sample pixels for performance (every 10th pixel)
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      // Skip transparent pixels
      if (alpha < 128) continue;

      // Reduce color space to improve grouping
      const key = `${Math.floor(r / 16) * 16}-${Math.floor(g / 16) * 16}-${
        Math.floor(b / 16) * 16
      }`;

      if (colorMap[key]) {
        colorMap[key].count++;
        colorMap[key].r += r;
        colorMap[key].g += g;
        colorMap[key].b += b;
      } else {
        colorMap[key] = { count: 1, r, g, b };
      }
    }

    // Find the most frequent color
    let dominantColor = null;
    let maxCount = 0;

    for (const key in colorMap) {
      if (colorMap[key].count > maxCount) {
        maxCount = colorMap[key].count;
        const color = colorMap[key];
        dominantColor = {
          r: Math.round(color.r / color.count),
          g: Math.round(color.g / color.count),
          b: Math.round(color.b / color.count),
        };
      }
    }

    return dominantColor || { r: 249, g: 249, b: 249 }; // fallback to light gray
  } catch (error) {
    console.warn("Could not extract color from image:", error);
    return { r: 249, g: 249, b: 249 }; // fallback to light gray
  }
}

function getLuminance(r, g, b) {
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getContrastingTextColor(backgroundColor) {
  const textColorOptions = [
    { color: { r: 255, g: 255, b: 255 }, css: "rgb(255, 255, 255)" }, // white
    { color: { r: 0, g: 0, b: 0 }, css: "rgb(0, 0, 0)" }, // black
    { color: { r: 51, g: 51, b: 51 }, css: "rgb(51, 51, 51)" }, // dark gray
    { color: { r: 204, g: 204, b: 204 }, css: "rgb(204, 204, 204)" }, // light gray
    { color: { r: 34, g: 34, b: 34 }, css: "rgb(34, 34, 34)" }, // very dark gray
  ];

  let bestOption = textColorOptions[0]; // fallback to white
  let bestContrast = 0;

  // Find the color with the highest contrast ratio
  for (const option of textColorOptions) {
    const contrast = getContrastRatio(backgroundColor, option.color);
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestOption = option;
    }
  }

  // Ensure minimum WCAG AA compliance (4.5:1)
  if (bestContrast < 4.5) {
    // If no option meets the standard, choose the best available
    console.warn(
      `Low contrast detected: ${bestContrast.toFixed(
        2
      )}:1 with background rgb(${backgroundColor.r}, ${backgroundColor.g}, ${
        backgroundColor.b
      })`
    );
  }

  return bestOption.css;
}

function createContrastingHue(dominantColor, backgroundColor) {
  // Convert RGB to HSL to work with hue
  const dominantHSL = rgbToHsl(
    dominantColor.r,
    dominantColor.g,
    dominantColor.b
  );
  const backgroundLuminance = getLuminance(
    backgroundColor.r,
    backgroundColor.g,
    backgroundColor.b
  );

  // Determine if we need a darker or lighter version based on background
  let targetLightness;
  if (backgroundLuminance > 0.5) {
    // Light background - make the hue darker
    targetLightness = Math.max(0.15, dominantHSL.l * 0.3);
  } else {
    // Dark background - make the hue lighter
    targetLightness = Math.min(0.85, dominantHSL.l + (1 - dominantHSL.l) * 0.7);
  }

  // Keep the same hue and saturation, but adjust lightness
  const adjustedHSL = {
    h: dominantHSL.h,
    s: Math.min(0.8, dominantHSL.s * 1.2), // Slightly increase saturation for vibrancy
    l: targetLightness,
  };

  // Convert back to RGB
  const adjustedRGB = hslToRgb(adjustedHSL.h, adjustedHSL.s, adjustedHSL.l);

  // Verify contrast and adjust if needed
  const contrastRatio = getContrastRatio(backgroundColor, adjustedRGB);
  if (contrastRatio < 4.5) {
    // If still not enough contrast, make it more extreme
    if (backgroundLuminance > 0.5) {
      adjustedHSL.l = 0.1; // Very dark
    } else {
      adjustedHSL.l = 0.9; // Very light
    }
    const finalRGB = hslToRgb(adjustedHSL.h, adjustedHSL.s, adjustedHSL.l);
    return `rgb(${Math.round(finalRGB.r)}, ${Math.round(
      finalRGB.g
    )}, ${Math.round(finalRGB.b)})`;
  }

  return `rgb(${Math.round(adjustedRGB.r)}, ${Math.round(
    adjustedRGB.g
  )}, ${Math.round(adjustedRGB.b)})`;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: r * 255, g: g * 255, b: b * 255 };
}

function applyDominantColorToCard(bookCard, dominantColor) {
  // Calculate luminance of the dominant color to determine tinting strategy
  const dominantLuminance = getLuminance(
    dominantColor.r,
    dominantColor.g,
    dominantColor.b
  );

  // Adjust tinting based on luminance - darker colors get more tinting
  const tintAmount = dominantLuminance < 0.3 ? 0.9 : 0.85;

  // Create a light tint of the dominant color for background
  const tintedColor = {
    r: Math.round(dominantColor.r + (255 - dominantColor.r) * tintAmount),
    g: Math.round(dominantColor.g + (255 - dominantColor.g) * tintAmount),
    b: Math.round(dominantColor.b + (255 - dominantColor.b) * tintAmount),
  };

  const backgroundColor = `rgb(${tintedColor.r}, ${tintedColor.g}, ${tintedColor.b})`;
  const textColor = getContrastingTextColor(tintedColor);

  // Extract RGB values from textColor string for use with rgba()
  const textColorMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const textColorRgb = textColorMatch
    ? `${textColorMatch[1]}, ${textColorMatch[2]}, ${textColorMatch[3]}`
    : "51, 51, 51";

  // Create a better button background - adjust dominant color for better contrast
  let buttonBgColor = { ...dominantColor };

  // If dominant color is too dark or too light, adjust it for better button visibility
  if (dominantLuminance < 0.2) {
    // Very dark colors - lighten them significantly
    buttonBgColor = {
      r: Math.min(
        255,
        Math.round(dominantColor.r + (255 - dominantColor.r) * 0.4)
      ),
      g: Math.min(
        255,
        Math.round(dominantColor.g + (255 - dominantColor.g) * 0.4)
      ),
      b: Math.min(
        255,
        Math.round(dominantColor.b + (255 - dominantColor.b) * 0.4)
      ),
    };
  } else if (dominantLuminance > 0.8) {
    // Very light colors - darken them
    buttonBgColor = {
      r: Math.round(dominantColor.r * 0.6),
      g: Math.round(dominantColor.g * 0.6),
      b: Math.round(dominantColor.b * 0.6),
    };
  }

  const buttonBgColorString = `rgb(${buttonBgColor.r}, ${buttonBgColor.g}, ${buttonBgColor.b})`;
  const buttonBgColorRgb = `${buttonBgColor.r}, ${buttonBgColor.g}, ${buttonBgColor.b}`;

  // Calculate contrasting text color for the button background
  const buttonTextColor = getContrastingTextColor(buttonBgColor);

  // Create a darker/lighter version of the dominant color for button text that has good contrast
  const buttonTextHue = createContrastingHue(dominantColor, tintedColor);

  // Apply colors using CSS custom properties
  bookCard.style.setProperty("--hover-bg-color", backgroundColor);
  bookCard.style.setProperty("--hover-text-color", textColor);
  bookCard.style.setProperty("--hover-text-color-rgb", textColorRgb);
  bookCard.style.setProperty("--dominant-color", buttonBgColorString);
  bookCard.style.setProperty("--dominant-color-rgb", buttonBgColorRgb);
  bookCard.style.setProperty("--button-text-color", buttonTextColor);
  bookCard.style.setProperty("--button-text-hue", buttonTextHue);

  // Add a class to indicate this card has custom colors
  bookCard.classList.add("has-custom-colors");
}

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
  addBookToLibrary("My Ex's Diary", "My Ex", 2018, readStatus.AVAILABLE),
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
    coverImage.crossOrigin = "Anonymous";
    coverImage.src = book.cover;
    coverImage.alt = `${book.title} cover image`;
    coverImage.className = "book-cover-image";
    coverDiv.appendChild(coverImage);

    // Extract and apply dominant color for the book cover
    coverImage.addEventListener("load", () => {
      try {
        const dominantColor = extractDominantColor(coverImage);
        applyDominantColorToCard(bookCard, dominantColor);
      } catch (error) {
        console.warn("Could not process image for color extraction:", error);
        // Keep default styling for failed color extraction
      }
    });

    // Handle image loading errors
    coverImage.addEventListener("error", () => {
      console.warn("Image failed to load:", book.cover);
      // Keep default styling for failed images
    });
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

  const details = document.createElement("div");
  details.className = "book-details";

  const title = document.createElement("h3");
  title.className = "book-title";
  title.textContent = book.title;
  details.appendChild(title);

  const author = document.createElement("p");
  author.className = "book-author";
  const authorSpan = document.createElement("span");
  authorSpan.textContent = `by ${book.author}`;
  author.appendChild(authorSpan);
  details.appendChild(author);

  const year = document.createElement("span");
  year.className = "book-year";
  year.textContent = book.yearPublished;
  details.appendChild(year);

  const toggleStatusButton = document.createElement("button");
  toggleStatusButton.className = "toggle-status-btn";
  toggleStatusButton.textContent =
    book.readStatus === readStatus.AVAILABLE
      ? "Read"
      : book.readStatus === readStatus.READING
      ? "Finish"
      : "Unread";
  toggleStatusButton.addEventListener("click", () => {
    book.toggleStatus();
    displayBooks();
  });
  details.appendChild(toggleStatusButton);

  bookCard.appendChild(details);

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

    form.reset();
    dialog.close();
    displayBooks();
  } catch (error) {
    alert(error.message);
  }
});
