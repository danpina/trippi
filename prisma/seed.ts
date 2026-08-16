import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TAXONOMY: Record<string, string[]> = {
  "Snow & Ski": ["Downhill", "Cross-country", "Snowboarding", "Off-piste"],
  "Hiking & Trekking": ["Day hikes", "Multi-day treks", "Mountain refuges"],
  "Running & Athletics": ["Road running", "Trail running", "Race & marathon meetups"],
  "Golf": ["Golf trip", "Spare tee time", "Lesson & practice buddy"],
  "Cycling": ["Road", "Mountain bike", "Gravel", "Bikepacking"],
  "Water Sports": ["Sailing", "Surfing", "Diving", "Kayaking"],
  "Climbing & Mountain": ["Via ferrata", "Rock climbing", "Mountaineering"],
  "Wellness & Retreat": ["Yoga", "Spa", "Quiet cabin weekend"],
  "City & Culture": ["City break", "Festival", "Food trip"],
  "Road Trip & Camping": ["Van life", "Campsite", "Motorhome swap"],
  "Other": [],
};

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  for (const [top, subs] of Object.entries(TAXONOMY)) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(top) },
      update: {},
      create: { name: top, slug: slugify(top) },
    });
    for (const sub of subs) {
      const slug = `${slugify(top)}-${slugify(sub)}`;
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: { name: sub, slug, parentId: parent.id },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@tripswap.dev";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: await bcrypt.hash("admin1234", 10),
      isAdmin: true,
    },
  });

  const demoOwner = await prisma.user.upsert({
    where: { email: "chamonix.chalet@example.com" },
    update: {},
    create: {
      email: "chamonix.chalet@example.com",
      name: "Elena",
      passwordHash: await bcrypt.hash("demo1234", 10),
      avgRating: 4.8,
      ratingCount: 12,
    },
  });

  const ski = await prisma.category.findUniqueOrThrow({ where: { slug: "snow-and-ski-downhill" } });
  const golf = await prisma.category.findUniqueOrThrow({ where: { slug: "golf-golf-trip" } });
  const run = await prisma.category.findUniqueOrThrow({ where: { slug: "running-and-athletics-road-running" } });

  const now = Date.now();
  const day = 86400000;

  const existing = await prisma.listing.count();
  if (existing === 0) {
    await prisma.listing.create({
      data: {
        ownerId: demoOwner.id,
        listingType: "opportunity",
        categoryId: ski.id,
        title: "Spare week in a Chamonix chalet — can't travel anymore",
        description:
          "Booked for 6, only 3 of us can go. Ski-in/ski-out chalet, 3 free beds, all lift-adjacent. Dates are fixed, non-refundable.",
        location: "Chamonix, France",
        lat: 45.9237,
        lng: 6.8694,
        dateStart: new Date(now + 20 * day),
        dateEnd: new Date(now + 27 * day),
        price: 340,
        capacity: 3,
        moderationStatus: "published",
        boosted: true,
      },
    });
    await prisma.listing.create({
      data: {
        ownerId: demoOwner.id,
        listingType: "opportunity",
        categoryId: golf.id,
        title: "Golf trip to Algarve, one spot free after a cancellation",
        description:
          "Foursome booked at a Vilamoura resort, one player dropped out. Tee times and 4 nights included.",
        location: "Vilamoura, Portugal",
        lat: 37.0788,
        lng: -8.1176,
        dateStart: new Date(now + 35 * day),
        dateEnd: new Date(now + 39 * day),
        price: 410,
        capacity: 1,
        moderationStatus: "published",
      },
    });
    await prisma.listing.create({
      data: {
        ownerId: admin.id,
        listingType: "plan",
        categoryId: run.id,
        title: "Saturday morning 10k along the river — all paces welcome",
        description: "A few of us run this loop every Saturday. Coffee after. Join whenever.",
        location: "Lisbon, Portugal",
        lat: 38.7223,
        lng: -9.1393,
        dateStart: new Date(now + 5 * day),
        dateEnd: new Date(now + 5 * day),
        capacity: 8,
        moderationStatus: "published",
      },
    });

    // A cluster of nearby Alpine listings so map clustering has something to demonstrate.
    const alpineSpots: [string, string, number, number][] = [
      ["Spare 3 nights in Verbier — chalet swap fell through", "Verbier, Switzerland", 46.0967, 7.2286],
      ["Zermatt week, one bed free — group of 5 down to 4", "Zermatt, Switzerland", 46.0207, 7.7491],
      ["Val Thorens studio, dates fixed, can't make it anymore", "Val Thorens, France", 45.2977, 6.5805],
      ["Courmayeur weekend — join us off-piste", "Courmayeur, Italy", 45.7938, 6.9689],
    ];
    for (const [title, location, lat, lng] of alpineSpots) {
      await prisma.listing.create({
        data: {
          ownerId: demoOwner.id,
          listingType: "opportunity",
          categoryId: ski.id,
          title,
          description: "Part of a small cluster of Alpine listings seeded to demo map clustering.",
          location,
          lat,
          lng,
          dateStart: new Date(now + 25 * day),
          dateEnd: new Date(now + 30 * day),
          price: 280,
          capacity: 2,
          moderationStatus: "published",
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
