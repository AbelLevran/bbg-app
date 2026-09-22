export function validate(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.validated = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path.join('.').replace(/^(body|query|params)\./, ''),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}
