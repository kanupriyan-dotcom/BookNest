require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const Book = require('./models/Book');
const Category = require('./models/Category');
const Borrowing = require('./models/borrowing');
const Reservation = require('./models/Reservation');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/booknest');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      Category.deleteMany({}),
      Borrowing.deleteMany({}),
      Reservation.deleteMany({}),
    ]);
    console.log('Cleared existing collections.');

    // 1. Seed Users
    const users = await User.create([
      {
        name: 'Eleanor Vance',
        email: 'librarian@booknest.com',
        password: 'password123',
        role: 'librarian',
        membershipStatus: 'active',
        maxBorrowLimit: 10,
      },
      {
        name: 'Alexander Croft',
        email: 'admin@booknest.com',
        password: 'password123',
        role: 'admin',
        membershipStatus: 'active',
        maxBorrowLimit: 15,
      },
      {
        name: 'Sarah Jenkins',
        email: 'sarah@example.com',
        password: 'password123',
        role: 'member',
        membershipStatus: 'active',
        maxBorrowLimit: 3,
      },
      {
        name: 'Marcus Brody',
        email: 'marcus@example.com',
        password: 'password123',
        role: 'member',
        membershipStatus: 'active',
        maxBorrowLimit: 4,
      },
      {
        name: 'Elena Rostova',
        email: 'elena@example.com',
        password: 'password123',
        role: 'member',
        membershipStatus: 'suspended',
        maxBorrowLimit: 2,
      },
    ]);
    console.log(`Created ${users.length} users.`);

    // 2. Seed Categories
    const categories = await Category.create([
      { name: 'Computer Science', description: 'Algorithms, Software Engineering, AI and System Design' },
      { name: 'Fiction & Literature', description: 'Classic and modern fictional masterpieces' },
      { name: 'Science Fiction', description: 'Speculative fiction, space exploration, and futuristic visions' },
      { name: 'History & Society', description: 'Human history, geopolitics, and civilizations' },
      { name: 'Philosophy & Thought', description: 'Epistemology, ethics, logic, and existentialism' },
      { name: 'Design & Architecture', description: 'UI/UX, visual art, typography, and structural design' },
    ]);
    console.log(`Created ${categories.length} categories.`);

    const catMap = {};
    categories.forEach((c) => {
      catMap[c.name] = c._id;
    });

    // 3. Seed Books with OpenLibrary cover references and replacement costs
    const books = await Book.create([
      {
        title: 'Designing Data-Intensive Applications',
        isbn: '9781449373320',
        authors: ['Martin Kleppmann'],
        categories: [catMap['Computer Science']],
        publisher: "O'Reilly Media",
        publicationYear: 2017,
        description: 'The definitive guide to the architecture, scalability, consistency, and reliability of modern distributed data systems.',
        totalCopies: 4,
        availableCopies: 2,
        shelfLocation: 'Stack CS-102',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9781449373320-M.jpg',
        condition: 'good',
        replacementCost: 45.0,
      },
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        isbn: '9780132350884',
        authors: ['Robert C. Martin'],
        categories: [catMap['Computer Science']],
        publisher: 'Prentice Hall',
        publicationYear: 2008,
        description: 'Even bad code can function. But if code isn’t clean, it can bring a development organization to its knees. Master writing readable, maintainable software.',
        totalCopies: 5,
        availableCopies: 3,
        shelfLocation: 'Stack CS-105',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg',
        condition: 'good',
        replacementCost: 35.0,
      },
      {
        title: 'Structure and Interpretation of Computer Programs',
        isbn: '9780262510875',
        authors: ['Harold Abelson', 'Gerald Jay Sussman'],
        categories: [catMap['Computer Science']],
        publisher: 'MIT Press',
        publicationYear: 1996,
        description: 'The legendary "Wizard Book" exploring the fundamental conceptual abstractions of programming and computation.',
        totalCopies: 2,
        availableCopies: 0, // Out of stock to test reservation!
        shelfLocation: 'Stack CS-110',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780262510875-M.jpg',
        condition: 'good',
        replacementCost: 50.0,
      },
      {
        title: 'Dune',
        isbn: '9780441172719',
        authors: ['Frank Herbert'],
        categories: [catMap['Science Fiction']],
        publisher: 'Chilton Books',
        publicationYear: 1965,
        description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.',
        totalCopies: 6,
        availableCopies: 4,
        shelfLocation: 'Stack SF-201',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg',
        condition: 'good',
        replacementCost: 20.0,
      },
      {
        title: 'Neuromancer',
        isbn: '9780441569595',
        authors: ['William Gibson'],
        categories: [catMap['Science Fiction']],
        publisher: 'Ace Books',
        publicationYear: 1984,
        description: 'The seminal cyberpunk novel that introduced the matrix, cyberspace, and the neon noir aesthetic of rogue console cowboys.',
        totalCopies: 3,
        availableCopies: 1,
        shelfLocation: 'Stack SF-204',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780441569595-M.jpg',
        condition: 'fair',
        replacementCost: 18.0,
      },
      {
        title: 'The Great Gatsby',
        isbn: '9780743273565',
        authors: ['F. Scott Fitzgerald'],
        categories: [catMap['Fiction & Literature']],
        publisher: "Charles Scribner's Sons",
        publicationYear: 1925,
        description: 'The exemplary novel of the Jazz Age, capturing the tragic glamour and disillusionment of the American Dream in 1920s Long Island.',
        totalCopies: 4,
        availableCopies: 3,
        shelfLocation: 'Stack LIT-301',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780743273565-M.jpg',
        condition: 'good',
        replacementCost: 15.0,
      },
      {
        title: 'To Kill a Mockingbird',
        isbn: '9780061120084',
        authors: ['Harper Lee'],
        categories: [catMap['Fiction & Literature']],
        publisher: 'J. B. Lippincott & Co.',
        publicationYear: 1960,
        description: 'The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it, exploring empathy and justice.',
        totalCopies: 5,
        availableCopies: 5,
        shelfLocation: 'Stack LIT-304',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780061120084-M.jpg',
        condition: 'pristine',
        replacementCost: 16.0,
      },
      {
        title: 'Sapiens: A Brief History of Humankind',
        isbn: '9780062316097',
        authors: ['Yuval Noah Harari'],
        categories: [catMap['History & Society']],
        publisher: 'Harper',
        publicationYear: 2014,
        description: 'From examining the role evolving humans have played in the global ecosystem to charting the rise of empires and money.',
        totalCopies: 4,
        availableCopies: 2,
        shelfLocation: 'Stack HIST-401',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg',
        condition: 'good',
        replacementCost: 28.0,
      },
      {
        title: 'Meditations',
        isbn: '9780140449334',
        authors: ['Marcus Aurelius'],
        categories: [catMap['Philosophy & Thought']],
        publisher: 'Penguin Classics',
        publicationYear: 2006,
        description: 'Private reflections and stoic philosophical aphorisms by the Roman Emperor on duty, self-discipline, mortality, and tranquility.',
        totalCopies: 3,
        availableCopies: 2,
        shelfLocation: 'Stack PHIL-501',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780140449334-M.jpg',
        condition: 'good',
        replacementCost: 14.0,
      },
      {
        title: 'The Design of Everyday Things',
        isbn: '9780465050659',
        authors: ['Don Norman'],
        categories: [catMap['Design & Architecture']],
        publisher: 'Basic Books',
        publicationYear: 2013,
        description: 'The cognitive psychology behind product design, affordances, signifiers, and why some everyday tools delight while others frustrate.',
        totalCopies: 4,
        availableCopies: 3,
        shelfLocation: 'Stack DES-601',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780465050659-M.jpg',
        condition: 'good',
        replacementCost: 26.0,
      },
      {
        title: '1984',
        isbn: '9780451524935',
        authors: ['George Orwell'],
        categories: [catMap['Fiction & Literature'], catMap['Science Fiction']],
        publisher: 'Secker & Warburg',
        publicationYear: 1949,
        description: 'The dystopian classic depicting the oppressive totalitarian surveillance state of Oceania and the rebellion of Winston Smith.',
        totalCopies: 5,
        availableCopies: 3,
        shelfLocation: 'Stack LIT-308',
        coverImage: 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg',
        condition: 'good',
        replacementCost: 15.0,
      },
    ]);
    console.log(`Created ${books.length} books.`);

    // 4. Seed Borrowings
    const librarian = users[0];
    const sarah = users[2];
    const marcus = users[3];

    const ddia = books[0];
    const cleanCode = books[1];
    const sicp = books[2];
    const dune = books[3];
    const neuromancer = books[4];

    // Active loan (due in 7 days)
    const activeDueDate = new Date();
    activeDueDate.setDate(activeDueDate.getDate() + 7);

    // Overdue loan (was due 4 days ago)
    const overdueDueDate = new Date();
    overdueDueDate.setDate(overdueDueDate.getDate() - 4);
    const overdueIssueDate = new Date();
    overdueIssueDate.setDate(overdueIssueDate.getDate() - 18);

    // Returned loan
    const pastIssueDate = new Date();
    pastIssueDate.setDate(pastIssueDate.getDate() - 25);
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 11);
    const pastReturnDate = new Date();
    pastReturnDate.setDate(pastReturnDate.getDate() - 12);

    await Borrowing.create([
      {
        book: ddia._id,
        user: sarah._id,
        issuedBy: librarian._id,
        issueDate: new Date(),
        dueDate: activeDueDate,
        status: 'borrowed',
        damageFee: 0,
      },
      {
        book: cleanCode._id,
        user: sarah._id,
        issuedBy: librarian._id,
        issueDate: overdueIssueDate,
        dueDate: overdueDueDate,
        status: 'overdue',
        fineAmount: 2.0, // 4 days * $0.50
        damageFee: 5.0, // Minor damage assessed
        damageReport: {
          damageScore: 18,
          damageLevel: 'minor',
          defects: ['Surface scratch or sharp crease detected', 'Minor edge wear and handling marks'],
          notes: 'Minor wear detected on Clean Code. Light cover creasing or surface handling marks.',
          damageFee: 5.0,
          modelUsed: 'Hugging Face ViT + Visual Differencer',
          assessedAt: new Date(),
        },
        fineStatus: 'unpaid',
      },
      {
        book: dune._id,
        user: marcus._id,
        issuedBy: librarian._id,
        issueDate: new Date(),
        dueDate: activeDueDate,
        status: 'borrowed',
        damageFee: 0,
      },
      {
        book: neuromancer._id,
        user: marcus._id,
        issuedBy: librarian._id,
        issueDate: pastIssueDate,
        dueDate: pastDueDate,
        returnDate: pastReturnDate,
        status: 'returned',
        fineAmount: 0,
        damageFee: 0,
        fineStatus: 'none',
      },
    ]);
    console.log('Created sample borrowing records (with damage inspection and late fees).');

    // 5. Seed Reservations
    const holdExpires = new Date();
    holdExpires.setHours(holdExpires.getHours() + 36);

    await Reservation.create([
      {
        book: sicp._id,
        user: sarah._id,
        status: 'ready_for_pickup',
        notifiedAt: new Date(),
        holdExpiresAt: holdExpires,
      },
      {
        book: sicp._id,
        user: marcus._id,
        status: 'pending',
        reservedAt: new Date(Date.now() - 86400000),
      },
    ]);
    console.log('Created sample reservations.');

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
