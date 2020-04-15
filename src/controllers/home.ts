import { Request, Response } from "express";
import {User} from "../models/User";

/**
 * GET /
 * Home page.
 */
export const index = (req: Request, res: Response) => {
    res.render("home", {
        title: "Home"
    });
};
