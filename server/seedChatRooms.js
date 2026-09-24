/**
 * EAZY CHECK - Chat Room Seeder
 * --------------------------------
 * Creates the 8 default EAZY CHECK community rooms.
 *
 * Run from the server folder:
 *   node seedChatRooms.js
 *
 * The script is safe to run multiple times.
 * Existing rooms with the same slug will not be duplicated.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const Room = require('./models/Room');

// ============================================================
// EAZY CHECK DEFAULT ROOMS
// ============================================================

const chatRooms = [
  {
    name: 'Global Lounge',
    slug: 'general',
    description:
      'The main EAZY CHECK community room. Meet people, chat, share ideas and stay connected.',
    type: 'public',
  },

  {
    name: 'Funny Room',
    slug: 'funny',
    description:
      'A relaxed space for jokes, memes, funny stories and entertaining conversations.',
    type: 'public',
  },

  {
    name: 'Dating Room',
    slug: 'dating',
    description:
      'Connect, meet new people and have respectful conversations about relationships and dating.',
    type: 'public',
  },

  {
    name: 'Love Room',
    slug: 'love',
    description:
      'Talk about love, relationships, marriage, friendship and everything in between.',
    type: 'public',
  },

  {
    name: 'Music Room',
    slug: 'music',
    description:
      'Talk about music, artists, songs, entertainment, performances and your favourite sounds.',
    type: 'public',
  },

  {
    name: 'Tutorial Room',
    slug: 'tutorial',
    description:
      'Learn and share useful tutorials, skills, tips, guides and educational resources.',
    type: 'public',
  },

  {
    name: 'Coders & Builders',
    slug: 'tech',
    description:
      'A technology community for programmers, developers, designers, builders and tech enthusiasts.',
    type: 'public',
  },

  {
    name: 'Entrepreneurs & Print',
    slug: 'business',
    description:
      'Discuss business, entrepreneurship, printing, graphics, marketing, branding and making money.',
    type: 'public',
  },
];

// ============================================================
// DATABASE CONNECTION
// ============================================================

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        'MONGO_URI is missing from your .env file.'
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('==============================================');
    console.log('✅ MongoDB connected successfully');
    console.log('==============================================');
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error(error.message);

    process.exit(1);
  }
};

// ============================================================
// SEED ROOMS
// ============================================================

const seedChatRooms = async () => {
  try {
    console.log('');
    console.log('🚀 Starting EAZY CHECK chat room seeder...');
    console.log('');

    let createdCount = 0;
    let existingCount = 0;

    for (const roomData of chatRooms) {
      const existingRoom = await Room.findOne({
        slug: roomData.slug,
      });

      if (existingRoom) {
        existingCount++;

        console.log(
          `⚪ Already exists: ${existingRoom.name} (/chat/${existingRoom.slug})`
        );

        continue;
      }

      const room = await Room.create({
        name: roomData.name,
        slug: roomData.slug,
        description: roomData.description,
        type: roomData.type,
        members: [],
        created_by: null,
        is_archived: false,
      });

      createdCount++;

      console.log(
        `✅ Created: ${room.name} (/chat/${room.slug})`
      );
    }

    console.log('');
    console.log('==============================================');
    console.log('🎉 EAZY CHECK CHAT ROOM SEED COMPLETE');
    console.log('==============================================');
    console.log(`📌 Total default rooms: ${chatRooms.length}`);
    console.log(`🟢 Newly created:       ${createdCount}`);
    console.log(`⚪ Already existed:      ${existingCount}`);
    console.log('==============================================');
    console.log('');

    console.log('Available rooms:');

    chatRooms.forEach((room, index) => {
      console.log(
        `${index + 1}. ${room.name} → /chat/${room.slug}`
      );
    });

    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Failed to seed chat rooms.');
    console.error('Error:', error.message);
    console.error('');

    if (error.code === 11000) {
      console.error(
        '⚠️ Duplicate slug detected. Check the Room collection for duplicate room slugs.'
      );
    }

    process.exitCode = 1;
  }
};

// ============================================================
// MAIN
// ============================================================

const runSeeder = async () => {
  try {
    await connectDB();
    await seedChatRooms();
  } catch (error) {
    console.error('❌ Seeder error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();

    console.log('🔌 MongoDB connection closed.');
    console.log('');
  }
};

runSeeder();