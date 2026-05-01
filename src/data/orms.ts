export interface ORM {
  id: "prisma" | "typeorm" | "sequelize";
  name: string;
}

export const orms: ORM[] = [
  {
    id: "prisma",
    name: "Prisma",
  },
  {
    id: "typeorm",
    name: "TypeORM",
  },
  {
    id: "sequelize",
    name: "Sequelize",
  },
];
