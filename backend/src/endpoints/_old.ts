  /**
   * Create a game deal.
   * # Request
   * POST, Authenticated, Body:
   *   - game_deal (GameDeal): Game deal to create. Should not include the "author_id" field.
   * 
   * # Response
   * 200, Body:
   *   - game_deal (GameDeal): Created game deal with all fields.
   */
  async epCreateGameDeal(req, res) {
    let deal = req.body.game_deal;
    deal.author_id = req.authUser._id;
      
    const inserted = (await this.db.game_deals.insertOne(deal)).ops[0];

    res.json({
      game_deal: inserted,
    });
  }

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
