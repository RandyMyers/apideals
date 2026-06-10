const express = require('express');
const rateLimit = require('express-rate-limit');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

const profileUpdateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.user?._id || req.ip),
  message: {
    success: false,
    message: 'Too many profile updates. Please try again in an hour.',
  },
});

router.get('/check-slug/:slug', authMiddleware, profileController.checkSlug);
router.get('/me/completion', authMiddleware, profileController.getCompletion);
router.get('/me/following-feed', authMiddleware, profileController.getMyFollowingFeed);
router.get('/me', authMiddleware, profileController.getMySettings);
router.patch('/me', authMiddleware, profileUpdateRateLimit, profileController.updateMyProfile);

router.post('/:slug/follow', authMiddleware, profileController.followUser);
router.delete('/:slug/follow', authMiddleware, profileController.unfollowUser);
router.get('/:slug/follow-status', optionalAuthMiddleware, profileController.getFollowStatus);

router.get(
  '/admin/list',
  authMiddleware,
  adminMiddleware(['superAdmin', 'customerSupport', 'contentEditor']),
  profileController.listPublicProfilesAdmin
);

router.patch(
  '/admin/:userId',
  authMiddleware,
  adminMiddleware(['superAdmin', 'customerSupport', 'contentEditor']),
  profileController.adminUpdateProfile
);

router.get('/featured/list', profileController.getFeaturedMembers);

router.get('/:slug/activity', profileController.getPublicActivity);
router.get('/:slug', profileController.getPublicProfile);

module.exports = router;
