/**
   * Factory which creates middleware that verifies a request body meets a JSON schema.
   * @param {Avj Compiled Schema} schema
   * @returns {function(req, res, next)} Middleware which responds with code 400 if the request body does not meet schema requirements.
   */
  mwValidateBodyFactory(schema) {
    return (req, res, next) => {
      const valid = schema(req.body);
      if (valid !== true) {
        let errsStr = schema.errors.map((e) => {
          let field = ".";
          if (e.instancePath.length > 0) {
            field = e.instancePath.toString().replace(/\//g, ".");
          }
          return `for JSON field "${field}": ${e.message}`;
        });
        
        res.status(400).json({
          error: `HTTP body does not meet schema requirements: ${errsStr}`,
        });
        return;
      }

      next();
    };
  }

  /**
   * Ensures the request contains a valid authentication token in the Authorization header. Sets the req.authUser field with the authenticated user and req.authToken with the authentication token. Responds with code 401 if no, or incorrect, authentication data was found.
   */
  async mwAuthenticate(req, res, next) {
    // Get header
    const tokenStr = req.header("Authorization");
    if (tokenStr === undefined) {
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Verify token
    try {
      req.authToken = await new Promise((resolve, reject) => {
        jwt.verify(
          tokenStr,
          this.cfg.authTokenSecret,
          {
            algorithms: [ AUTH_TOKEN_JWT_ALGORITHM ],
            audience: AUTH_TOKEN_AUDIENCE,
            issuer: AUTH_TOKEN_AUDIENCE,
          },
          (err, decoded) => {
            if (err !== undefined && err !== null) {
              reject(err);
              return;
            }

            resolve(decoded);
          });
      });
    } catch(e) {
      console.trace(`Error verifying JWT authentication token: ${e}`);
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Fetch user
    try {
      req.authUser = await this.db.admins.findOne({ _id: mongo.ObjectId(req.authToken.sub) });
      if (req.authUser === null) {
        res.status(401).json({
          error: "unauthorized",
        });
        return;
      }
    } catch (e) {
      console.trace(`Error retrieving user for authentication token, token.sub=${req.authToken.sub}, error: ${e}`);
      res.status(500).json({
        error: "internal error",
      });
      return;
    }

    next();
  }
  
  /**
   * Provide API status.
   * # Request
   * GET
   * 
   * # Response
   * 200 JSON:
   *   - ok (bool): Indicates if the API should be used.
   */
  epHealth(req, res) {
    res.json({
      foo: 1,
      ok: true,
    });
  }

  /**
   * Login. Optionally change password.
   * # Request
   * POST, Body:
   *   - username (string)
   *   - password (string)
   *   - new_password (string, optional): If provided the user's password will be changed. This is required if the .must_reset_password field is true on the user.
   * 
   * # Response
   * 200, Body:
   *   - auth_token (string)
   */
  async epLogin(req, res) {
    // Get user
    let user = null;
    try {
      user = await this.db.admins.findOne({
        username: req.body.username,
      });
    } catch (e) {
      console.trace(`Failed to retrieve a user: ${e}`);
      res.status(500).json({
        error: "internal error",
      });
      return;
    }

    if (user === null) {
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Check password
    try {
      let passwordOk = await bcrypt.compare(req.body.password, user.password_hash)
      if (passwordOk === false) {
        res.status(401).json({
          error: "unauthorized",
        });
        return;
      }
    } catch (e) {
      res.status(401).json({
        error: "unauthorized",
      });
      return;
    }

    // Set new password if needed
    if (user.must_reset_password === true && req.body.new_password === undefined) {
      res.status(401).json({
        error: "user must reset their password before logging in",
        error_code: ERROR_CODES.must_reset_password,
      });
      return;
    }

    if (req.body.new_password !== undefined) {
      // Check the new password is allowed
      const newPwOk = passwordAllowed(req.body.new_password);
      if (newPwOk !== null) {
        res.status(400).json({
          error: `failed to set new password: ${newPwOk}`,
        });
        return;
      }

      // Hash the password
      let newPwHash = null;
      try {
        newPwHash = await bcrypt.hash(req.body.new_password, BCRYPT_SALT_ROUNDS);
      } catch (e) {
        console.trace(`Failed to hash new password: ${e}`);

        res.status(500).json({
          error: "internal error",
        });
        return;
      }

      // Save the new password
      try {
        await this.db.admins.updateOne({
          _id: user._id,
        }, {
          $set: {
            password_hash: newPwHash,
            must_reset_password: false,
          },
        });
      } catch (e) {
        console.trace(`Failed to set new password: ${e}`);
        
        res.status(500).json({
          error: "internal error",
        });
        return;
      }
    }

    // Generate authentication token
    const token = await new Promise((resolve, reject) => {
      jwt.sign({
        aud: AUTH_TOKEN_AUDIENCE,
        iss: AUTH_TOKEN_AUDIENCE,
        sub: user._id,
      }, this.cfg.authTokenSecret, {
        algorithm: AUTH_TOKEN_JWT_ALGORITHM,
        expiresIn: '2w',
      }, (err, token) => {
        if (err !== undefined && err !== null) {
          reject(err);
          return;
        }

        resolve(token);
      });
    });

    res.json({
      auth_token: token,
    });
  }

  /**
   * Create an admin user. Requires the new user to change their password after they first login.
   * # Request
   * JSON body:
   *   - username (string): The new admin user's username.
   *   - invite_password (string): The password the new user will login with for the first time. Tell them this password. The new user must then change this password.
   * 
   * # Response
   * 200, Body:
   *   - new_admin_id (string): ID of the newly created user.
   */
  async epCreateAdmin(req, res) {
    // Check the new password is allowed
    const newPwOk = passwordAllowed(req.body.invite_password);
    if (newPwOk !== null) {
      res.status(400).json({
        error: `failed to create new admin: invite password is not allowed: ${newPwOk}`,
      });
      return;
    }

    // Hash the password
    let pwHash = null;
    try {
      pwHash = await bcrypt.hash(req.body.invite_password, BCRYPT_SALT_ROUNDS);
    } catch (e) {
      console.trace(`Failed to hash new admin's invite password: ${e}`);

      res.status(500).json({
        error: "internal error",
      });
      return;
    }

    // Insert admin user
    const inserted = await this.db.admins.insertOne({
      username: req.body.username,
      password_hash: pwHash,
      must_reset_password: true,
    });

    res.json({
      new_admin_id: inserted.insertedId,
    });
  }

  /**
   * List game deals.
   * # Request
   * GET, URL parameters:
   *   - offset (uint, optional, default 0): Game deals will be returned sorted by their start date. This parameter indicates the index of the first game deal to retrieve using this ordering.
   *   - expired (bool, optional, default false): If game deals which have expired should be retrieved.
   * 
   * # Response
   * 200, Body:
   *   - game_deals (GameDeal[]): Array of game deals sorted by their start date. Maximum of QUERY_LIMIT items.
   *   - next_offset (int): Next offset value to provide to access the next page of results. Is -1 if this page is the last page of results.
   */
  async epListGameDeals(req, res) {
    // URL query parameters
    let offset = null;
    try {
      offset = Number(req.query.offset) || 0;
    } catch (e) {
      res.status(400).json({
        error: "\"offset\" query parameter must be a number",
      });
      return;
    }
    
    const expired = req.query.offset || false;

    // Query
    let query = {};
    if (expired === false) {
      query["end_date"] = {
        $lte: unixTime(new Date()),
      };
    }

    const allDealsCount = await this.db.game_deals.find(query).count();
    const deals = await this.db.game_deals.find(query).skip(offset).limit(QUERY_LIMIT).toArray();
    
    let next_offset = -1;
    const nextPageDealsCount = (allDealsCount - offset) - QUERY_LIMIT;
    if (nextPageDealsCount > 0) {
      next_offset = offset + deals.length;
    }

    res.json({
      game_deals: deals,
      next_offset: next_offset,
    });
  }

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
