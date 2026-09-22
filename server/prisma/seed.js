import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BBG organization seed...');

  // Default dev password for all users
  const DEV_PASSWORD = 'password123';
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // Clean existing data in reverse relation order
  await prisma.activeTimer.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.timeSession.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.userCapacityOverride.deleteMany();
  await prisma.refreshToken.deleteMany();
  
  // Unset head_user_id to prevent circular foreign key constraints during delete
  await prisma.department.updateMany({ data: { head_user_id: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 1. Create the 4 Departments
  const deptNames = ['BMS', 'Retail', 'Wholesale', 'Production'];
  const departments = {};

  for (const name of deptNames) {
    const dept = await prisma.department.create({
      data: { name }
    });
    departments[name] = dept;
  }
  console.log(`🏢 Created 4 departments: ${deptNames.join(', ')}`);

  // 2. Define the 15 users per PRD §2
  const usersToSeed = [
    // 1 Head Group (oversight/monitoring role, no department)
    {
      name: 'Ahmad Fauzi',
      username: 'ahmad',
      role: UserRole.HEAD_GROUP,
      title: 'Head Group',
      department: null,
      isDeptHead: false
    },
    // BMS Department (1 Dept Head + 3 Members)
    {
      name: 'Budi Santoso',
      username: 'budi',
      role: UserRole.DEPARTMENT_HEAD,
      title: 'BMS Department Head',
      department: 'BMS',
      isDeptHead: true
    },
    {
      name: 'Citra Dewi',
      username: 'citra',
      role: UserRole.MEMBER,
      title: 'Senior Business Analyst',
      department: 'BMS',
      isDeptHead: false
    },
    {
      name: 'Dani Pratama',
      username: 'dani',
      role: UserRole.MEMBER,
      title: 'Systems Analyst',
      department: 'BMS',
      isDeptHead: false
    },
    {
      name: 'Eka Putri',
      username: 'eka',
      role: UserRole.MEMBER,
      title: 'BMS Specialist',
      department: 'BMS',
      isDeptHead: false
    },
    // Retail Department (1 Dept Head + 2 Members)
    {
      name: 'Fajar Nugraha',
      username: 'fajar',
      role: UserRole.DEPARTMENT_HEAD,
      title: 'Retail Department Head',
      department: 'Retail',
      isDeptHead: true
    },
    {
      name: 'Gita Permata',
      username: 'gita',
      role: UserRole.MEMBER,
      title: 'Retail Operations Analyst',
      department: 'Retail',
      isDeptHead: false
    },
    {
      name: 'Hadi Wijaya',
      username: 'hadi',
      role: UserRole.MEMBER,
      title: 'Retail Channel Coordinator',
      department: 'Retail',
      isDeptHead: false
    },
    // Wholesale Department (1 Dept Head + 3 Members)
    {
      name: 'Indri Safitri',
      username: 'indri',
      role: UserRole.DEPARTMENT_HEAD,
      title: 'Wholesale Department Head',
      department: 'Wholesale',
      isDeptHead: true
    },
    {
      name: 'Joko Susilo',
      username: 'joko',
      role: UserRole.MEMBER,
      title: 'Corporate Account Specialist',
      department: 'Wholesale',
      isDeptHead: false
    },
    {
      name: 'Kartika Sari',
      username: 'kartika',
      role: UserRole.MEMBER,
      title: 'Institutional Relations Analyst',
      department: 'Wholesale',
      isDeptHead: false
    },
    {
      name: 'Lukman Hakim',
      username: 'lukman',
      role: UserRole.MEMBER,
      title: 'Wholesale Solutions Analyst',
      department: 'Wholesale',
      isDeptHead: false
    },
    // Production Department (1 Dept Head + 2 Members)
    {
      name: 'Maya Anggraini',
      username: 'maya',
      role: UserRole.DEPARTMENT_HEAD,
      title: 'Production Department Head',
      department: 'Production',
      isDeptHead: true
    },
    {
      name: 'Nanda Putra',
      username: 'nanda',
      role: UserRole.MEMBER,
      title: 'Service Delivery Lead',
      department: 'Production',
      isDeptHead: false
    },
    {
      name: 'Oscar Pratama',
      username: 'oscar',
      role: UserRole.MEMBER,
      title: 'Quality Assurance Specialist',
      department: 'Production',
      isDeptHead: false
    }
  ];

  const createdUsers = [];

  for (const item of usersToSeed) {
    const user = await prisma.user.create({
      data: {
        name: item.name,
        username: item.username,
        password_hash: passwordHash,
        role: item.role,
        title: item.title,
        department_id: item.department ? departments[item.department].id : null,
        is_active: true,
        must_change_password: false
      }
    });

    // If department head, update department's head_user_id
    if (item.isDeptHead && item.department) {
      await prisma.department.update({
        where: { id: departments[item.department].id },
        data: { head_user_id: user.id }
      });
    }

    createdUsers.push({
      Username: user.username,
      Name: user.name,
      Role: user.role,
      Title: user.title,
      Department: item.department || '— (Head Group)',
      Password: DEV_PASSWORD
    });
  }

  console.log('\n✅ Successfully seeded BBG Organization (15 users total):');
  console.table(createdUsers);
  console.log(`\n🔑 All dev accounts password: "${DEV_PASSWORD}"\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
