/* eslint-disable @typescript-eslint/ban-ts-ignore */
import {Request, Response} from "express";
import {User} from "../models/User";
import {HEROKU_KEY, MONGODB_URI, SESSION_SECRET} from "../util/secrets";
import axios from "axios";


let appName: string = null;
let outputStreamUrl: string = null;

const hKey = HEROKU_KEY;

function createApp() {
    const header = {
        Accept: "application/vnd.heroku+json; version=3",
        Authorization: "Bearer " + hKey,
        "Content-Type": "application/json"
    };

    const createAppData = {
        name: appName,
        region: "ed30241c-ed8c-4bb6-9714-61953675d0b4"
    };

    return axios.post("https://api.heroku.com/apps", createAppData, {headers: header});
}

function buildApp() {
    const header = {
        Accept: "application/vnd.heroku+json; version=3",
        Authorization: "Bearer " + hKey,
        "Content-Type": "application/json"
    };

    const buildAppData = {
        "source_blob": {
            url: "https://github.com/cloudcmsbpr/cloudcms/archive/master.tar.gz"
        }
    };

    return axios.post(`https://api.heroku.com/apps/${appName}/builds`, buildAppData, {headers: header});
}

function addEnvVariables(userEmail: string) {
    const header = {
        Accept: "application/vnd.heroku+json; version=3",
        Authorization: "Bearer " + hKey,
        "Content-Type": "application/json"
    };

    const configData = {
        MONGODB_URI: MONGODB_URI,
        MONGODB_URI_LOCAL: MONGODB_URI,
        SESSION_SECRET: SESSION_SECRET,
        EXTERNAL_DB_USER_EMAIL: userEmail
    };

    return axios.patch(`https://api.heroku.com/apps/${appName}/config-vars`, configData, {headers: header});
}

export const createCMS = (req: Request, res: Response) => {
    if (req.user) {
        User.findOne(req.user).then(user => {
            if (!user.cmsUrl) {

                if (appName === null) {
                    appName = user.email.split("@")[0] + Math.random().toString(36).substring(7);
                }

                // create app

                createApp().then(r => {
                    // @ts-ignore
                    if (r.data && r.data.name && r.data.name === appName) {
                        req.flash("info", {msg: `${appName} created, deploying may take a while...`});

                        // build app

                        buildApp().then(r2 => {

                            // update database

                            user.cmsUrl = `https://${appName}.herokuapp.com/`;
                            user.save().catch(e => {console.log("Error while saving the user"); console.log(e);});

                            // @ts-ignore
                            if (r2 && r2.data && r2.data.output_stream_url) {
                                // @ts-ignore
                                outputStreamUrl = r2.data.output_stream_url;
                            } else {
                                outputStreamUrl = "error";
                            }
                        }).catch(e => {
                            console.log(e);
                        });

                        res.redirect("/");
                    }
                }).catch(e => {
                    req.flash("errors", {msg: `${e}`});
                    res.redirect("/");
                });


            } else {
                req.flash("info", {msg: `You already have a cms attached to your account: ${user.cmsUrl}`});
                res.redirect("/");
            }
        }).catch(e => {
            req.flash("errors", {msg: `${e}`});
            res.redirect("/");
        });

    }
};

export const getOutputStreamUrl = (req: Request, res: Response) => {
    // @ts-ignore
    res.send({outputStreamUrl: outputStreamUrl, hasAdded: req.user.cmsUrl});

};

export const deleteCMS = (req: Request, res: Response) => {
    // @ts-ignore
    User.findOne(req.user).then(user => {
        user.cmsUrl = null;
        user.save().then(() => {res.redirect("/");}).catch(e => console.log(e));
    });
};

export const addEnvVars = (req: Request, res: Response) => {
    // @ts-ignore
    addEnvVariables(req.user.email).then(() => {
        return res.send({data: appName});
    }).catch(e => {
        req.flash("errors", {msg: `${e}`});
        res.redirect("/");
    });
};

