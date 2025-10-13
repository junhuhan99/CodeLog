const db = require('../config/database');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total projects
    const [totalProjects] = await db.execute(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
      [userId]
    );

    // Projects by type
    const [projectsByType] = await db.execute(
      'SELECT project_type, COUNT(*) as count FROM projects WHERE user_id = ? GROUP BY project_type',
      [userId]
    );

    // Total builds
    const [totalBuilds] = await db.execute(
      'SELECT COUNT(*) as count FROM builds b INNER JOIN projects p ON b.project_id = p.id WHERE p.user_id = ?',
      [userId]
    );

    // Successful builds
    const [successfulBuilds] = await db.execute(
      'SELECT COUNT(*) as count FROM builds b INNER JOIN projects p ON b.project_id = p.id WHERE p.user_id = ? AND b.build_status = ?',
      [userId, 'success']
    );

    // Recent activity (last 7 days)
    const [recentActivity] = await db.execute(
      'SELECT DATE(created_at) as date, COUNT(*) as count FROM projects WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date DESC',
      [userId]
    );

    // Push notifications sent (last 30 days)
    const [pushStats] = await db.execute(
      'SELECT SUM(sent_count) as total FROM push_notifications pn INNER JOIN projects p ON pn.project_id = p.id WHERE p.user_id = ? AND pn.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [userId]
    );

    const stats = {
      projects: {
        total: totalProjects[0].count,
        byType: projectsByType.reduce((acc, item) => {
          acc[item.project_type] = item.count;
          return acc;
        }, {})
      },
      builds: {
        total: totalBuilds[0].count,
        successful: successfulBuilds[0].count,
        failed: totalBuilds[0].count - successfulBuilds[0].count
      },
      activity: recentActivity,
      pushNotifications: {
        sent: pushStats[0]?.total || 0
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// Get project statistics
const getProjectStats = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Verify project ownership
    const [projects] = await db.execute(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // Total builds
    const [totalBuilds] = await db.execute(
      'SELECT COUNT(*) as count FROM builds WHERE project_id = ?',
      [projectId]
    );

    // Builds by status
    const [buildsByStatus] = await db.execute(
      'SELECT build_status, COUNT(*) as count FROM builds WHERE project_id = ? GROUP BY build_status',
      [projectId]
    );

    // Push notifications
    const [pushCount] = await db.execute(
      'SELECT COUNT(*) as count, SUM(sent_count) as total_sent FROM push_notifications WHERE project_id = ?',
      [projectId]
    );

    // Forms
    const [formsCount] = await db.execute(
      'SELECT COUNT(*) as count FROM forms WHERE project_id = ?',
      [projectId]
    );

    // Form submissions
    const [submissionsCount] = await db.execute(
      'SELECT COUNT(*) as count FROM form_submissions fs INNER JOIN forms f ON fs.form_id = f.id WHERE f.project_id = ?',
      [projectId]
    );

    // Tabs
    const [tabsCount] = await db.execute(
      'SELECT COUNT(*) as count FROM bottom_tabs WHERE project_id = ?',
      [projectId]
    );

    const stats = {
      builds: {
        total: totalBuilds[0].count,
        byStatus: buildsByStatus.reduce((acc, item) => {
          acc[item.build_status] = item.count;
          return acc;
        }, {})
      },
      pushNotifications: {
        count: pushCount[0].count,
        totalSent: pushCount[0].total_sent || 0
      },
      forms: {
        count: formsCount[0].count,
        submissions: submissionsCount[0].count
      },
      tabs: {
        count: tabsCount[0].count
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

module.exports = {
  getDashboardStats,
  getProjectStats
};
