const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized. Please log in.');
    }
    next();
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.session.userId || req.session.role !== role) {
            return res.status(403).send('Forbidden: Insufficient permissions.');
        }
        next();
    };
};

module.exports = { requireAuth, requireRole };