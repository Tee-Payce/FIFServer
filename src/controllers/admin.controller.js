const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalBooks = await prisma.book.count();
    const totalSermons = await prisma.sermon.count();
    const activeStories = await prisma.story.count({
      where: { expiresAt: { gt: new Date() } }
    });

    // Get user growth for the last 6 months
    const now = new Date();
    const userGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthDate,
            lt: nextMonthDate,
          },
        },
      });

      userGrowth.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        users: count,
      });
    }

    const subscriptionBreakdown = await prisma.user.groupBy({
      by: ['subscriptionTier'],
      _count: {
        _all: true
      }
    });

    // Fetch current pricing to calculate revenue
    const pricing = await prisma.pricing.findMany();
    const pricingMap = pricing.reduce((acc, p) => ({ ...acc, [p.id.toLowerCase()]: p.price }), {});

    const subscriptionAnalytics = subscriptionBreakdown.map(item => {
      const tier = item.subscriptionTier.toLowerCase();
      const count = item._count._all;
      const price = pricingMap[tier] || 0;
      return {
        tier: item.subscriptionTier,
        count,
        revenue: count * price
      };
    });

    // Monthly subscription growth (historical data)
    const subscriptionGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthlyData = {
        month: monthDate.toLocaleString('default', { month: 'short' }),
        total: 0,
        amount: 0,
      };

      for (const tier of ['standard', 'premium', 'vvip']) {
        const count = await prisma.subscription.count({
          where: {
            tier: tier,
            startDate: {
              gte: monthDate,
              lt: nextMonthDate,
            },
          },
        });
        const price = pricingMap[tier] || 0;
        monthlyData[tier] = count;
        monthlyData.total += count;
        monthlyData.amount += count * price;
      }
      subscriptionGrowth.push(monthlyData);
    }

    res.status(200).json({
      totalUsers,
      totalBooks,
      totalSermons,
      activeStories,
      userGrowth,
      subscriptionAnalytics,
      subscriptionGrowth,
      subscriptionBreakdown: subscriptionAnalytics.map(item => ({
        name: item.tier,
        value: item.count
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin stats', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true
      }
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { role, subscriptionTier, isActive } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        role,
        subscriptionTier,
        isActive
      }
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

const getAllComments = async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.bookReview.findMany({
      include: {
        user: { select: { name: true, email: true } },
        book: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUser,
  deleteUser,
  getAllComments,
  getAllReviews
};
