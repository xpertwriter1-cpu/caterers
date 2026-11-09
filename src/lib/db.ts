import bcrypt from "bcryptjs";
import { prisma, assertAtlasUrl } from "./prisma";

export async function connectDatabase() {
  assertAtlasUrl();
  await prisma.$connect();
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
      "Food and hospitality support for corporate functions, workshops, meetings and conferences. Service area and availability are confirmed on request.",
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
  await connectDatabase();
  // Insert absent catalogue items; preserve all existing owner edits.
  for (const service of starterServices) {
    if (!(await prisma.service.findFirst({ where: { name: service.name } })))
      await prisma.service.create({ data: service });
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (
    email &&
    password.length >= 12 &&
    !["ChangeThisPassword123!", "ReplaceWithALongUniquePassword123!"].includes(
      password,
    )
  ) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: process.env.ADMIN_NAME || "Site Administrator",
        passwordHash: await bcrypt.hash(password, 12),
        role: "admin",
      },
    });
  }
}
