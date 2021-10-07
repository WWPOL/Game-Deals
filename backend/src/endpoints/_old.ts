  /**
   * Retrieve an admin by ID.
   * # Request
   * GET, URL parameters:
   *   - id (string): ID of admin to retrieve.
   *
   * # Response
   * 200, Body:
   *   - admin (Admin): Specified admin without `password_hash` field.
   *
   * 404, if admin with ID not found.
   */
  async epGetAdmin(req, res) {
    const id = req.params.id;

    // Retrieve admin
    const admin = await this.db.admins.findOne({
      _id: mongo.ObjectId(id),
    });

    if (admin === null) {
      // If admin not found
      res.status(404).json({
        error: "not found",
      });
      return;
    }

    // Delete password information
    delete admin.password_hash;

    res.json({
      admin: admin,
    });
  }
