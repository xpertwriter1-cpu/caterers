import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Service, User } from "./models";

type DatabaseCache = {
  connection?: Promise<typeof mongoose>;
  seeded?: Promise<void>;
};
const shared = globalThis as typeof globalThis & {
  nannyDatabase?: DatabaseCache;
};
const cache = (shared.nannyDatabase ||= {});
export async function connectDatabase() {
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI is missing. Configure it in .env.");
  cache.connection ||= mongoose
    .connect(process.env.MONGODB_URI)
    .catch((error) => {
      cache.connection = undefined;
      throw error;
    });
  await cache.connection;
  cache.seeded ||= seedDatabase().catch((error) => {
    cache.seeded = undefined;
    throw error;
  });
  await cache.seeded;
}

const starterServices = [
  {
    name: "Kienyeji Chicken Feast",
    category: "Food",
    description:
      "Traditional kienyeji chicken prepared for family gatherings and celebrations. Serving size, preparation and availability are confirmed on request.",
    price: 0,
    quoteOnly: true,
    unit: "request a quote",
    image: "/images/kienyeji-chicken.jpg",
  },
  {
    name: "Traditional Kenyan Buffet",
    category: "Event Catering",
    description:
      "A custom spread inspired by Kenyan favourites such as nyama choma, pilau, chapati, mukimo, sukuma wiki and seasonal accompaniments.",
    price: 0,
    quoteOnly: true,
    unit: "per event quotation",
    image: "/images/kenyan-food-spread.jpg",
  },
  {
    name: "Wedding & Dowry Ceremony Catering",
    category: "Event Catering",
    description:
      "Catering planning for weddings, ruracio and dowry ceremonies, family celebrations and receptions.",
    price: 0,
    quoteOnly: true,
    unit: "custom quotation",
    image: "/images/elegant-event-tables.jpg",
  },
  {
    name: "Corporate & Conference Catering",
    category: "Event Catering",
    description:
      "Food and hospitality support for corporate functions, workshops, meetings and conferences in Nairobi and surrounding areas, subject to availability.",
    price: 0,
    quoteOnly: true,
    unit: "custom quotation",
    image: "/images/elegant-event-tables.jpg",
  },
  {
    name: "Tea, Snacks & Office Meals",
    category: "Food",
    description:
      "Request tea breaks, snacks, lunch and meal delivery for teams, meetings and gatherings. Menu and delivery arrangements are confirmed with you.",
    price: 0,
    quoteOnly: true,
    unit: "request a quote",
    image: "/images/refreshments.jpg",
  },
  {
    name: "Event Planning & Hospitality Team",
    category: "Hospitality",
    description:
      "Event coordination and hospitality support for private and cultural celebrations. Share your event plan to discuss the scope and availability.",
    price: 0,
    quoteOnly: true,
    unit: "custom quotation",
    image: "/images/nanny-event-team.jpg",
  },
];

export async function seedDatabase() {
  if (!(await Service.countDocuments()))
    await Service.insertMany(starterServices);
  else {
    // Add the Nanny catalogue without overwriting owner-edited services, and hide generic starter entries from the old demo.
    await Service.updateMany(
      {
        name: {
          $in: [
            "Office Lunch Box",
            "Celebration Buffet",
            "Corporate Event Catering",
            "Hospitality Service Team",
            "Tea & Snack Break",
            "Tables & Catering Equipment",
          ],
        },
      },
      { $set: { active: false } },
    );
    for (const item of starterServices) {
      const { image, quoteOnly, price, ...insertFields } = item;
      await Service.updateOne(
        { name: item.name },
        { $setOnInsert: insertFields, $set: { image, quoteOnly, price } },
        { upsert: true },
      );
    }
  }
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (
    adminEmail &&
    adminPassword &&
    adminPassword !== "ChangeThisPassword123!"
  ) {
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        name: process.env.ADMIN_NAME || "Site Administrator",
        email: adminEmail,
        passwordHash,
        role: "admin",
      });
      console.log(`Admin account created for ${adminEmail}`);
    }
  } else {
    console.warn(
      "Admin account not seeded. Set a unique ADMIN_EMAIL and strong ADMIN_PASSWORD in .env before startup.",
    );
  }
}
