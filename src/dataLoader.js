const fs = require('fs').promises;
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// === Classes (define the Object level structure) ===
class Header {
    constructor({ name, location, phone, email, linkedin, github }) {
        this.name = name;
        this.location = location;
        this.phone = phone;
        this.email = email;
        this.linkedin = linkedin;
        this.github = github;
    }
}

class Title {
    constructor({ title }) {
        this.title = title;
    }
}

class Summary {
    constructor({ summary }) {
        this.summary = summary;
    }
}

class Education {
    constructor({ institution, location, period, degree, option, skills }) {
        this.institution = institution;
        this.location = location;
        this.period = period;
        this.degree = degree;
        this.option = option;
        this.skills = skills;
    }
}

class Experience {
    constructor({ title, company, contract_type, duration, location, period, achievements }) {
        this.title = title;
        this.company = company;
        this.contract_type = contract_type;
        this.duration = duration;
        this.location = location;
        this.period = period;
        this.achievements = achievements;
    }
}

class Skill {
    constructor({ skill_title, skill_details }) {
        this.skill_title = skill_title;
        this.skill_details = skill_details;
    }
}

class PersonalAchievement {
    constructor({ achievement, description }) {
        this.achievement = achievement;
        this.description = description;
    }
}

class CvData {
    constructor({ header, title, summary, education, experience, skills, personnal_achievements }) {
        this.header = header;
        this.title = title;
        this.summary = summary;
        this.education = education;
        this.experience = experience;
        this.skills = skills;
        this.personnal_achievements = personnal_achievements;
    }

    toString(verbose = false) {
        let txt = `=== ${this.header.name} ===\n`;
        txt += `Title: ${this.title.title}\n`;
        txt += `Location: ${this.header.location}\n`;
        txt += `Email: ${this.header.email}\n`;
        txt += `Phone: ${this.header.phone}\n\n`;

        txt += `Summary:\n${this.summary.summary}\n\n`;

        txt += `Education:\n`;
        for (const edu of this.education) {
            txt += `- Institution: ${edu.institution}\n`;
            txt += `  Location: ${edu.location}\n`;
            txt += `  Period: ${edu.period}\n`;
            txt += `  Degree: ${edu.degree}\n`;
            if (edu.option) txt += `  Option: ${edu.option}\n`;
            if (verbose) txt += `  Skills: ${edu.skills}\n`;
            txt += `\n`;
        }

        txt += `Experience:\n`;
        for (const exp of this.experience) {
            txt += `- Title: ${exp.title}\n`;
            txt += `  Company: ${exp.company}\n`;
            txt += `  Contract Type: ${exp.contract_type}\n`;
            txt += `  Duration: ${exp.duration}\n`;
            txt += `  Location: ${exp.location}\n`;
            txt += `  Period: ${exp.period}\n`;
            if (verbose && exp.achievements) txt += `  Achievements:\n${exp.achievements}\n`;
            txt += `\n`;
        }

        txt += `Skills:\n`;
        for (const sk of this.skills) {
            txt += `- ${sk.skill_title}: ${sk.skill_details}\n\n`;
        }

        txt += `Personal Achievements:\n`;
        for (const pa of this.personnal_achievements) {
            txt += `- ${pa.achievement}: ${pa.description}\n\n`;
        }

        return txt;
    }
}

async function loadJson(filePath) {
    const fullPath = path.resolve(filePath);
    console.log(`Loading JSON file: ${fullPath}`);
    const raw = await fs.readFile(fullPath, 'utf-8');
    const clean = raw.replace(/^\uFEFF/, ''); // Disable BOM if present, useful for Windows-generated files or sometimes LLMs
    return JSON.parse(clean);
}

async function loadCvData(configPath) {
    const config = await loadJson(configPath);

    const header = new Header(await loadJson(config.header));
    const title = new Title(await loadJson(config.title));
    const summary = new Summary(await loadJson(config.summary));

    const education = [];
    for (const eduPath of config.education) {
        const eduJson = await loadJson(eduPath);
        education.push(new Education(eduJson));
    }

    const experience = [];
    for (const expPath of config.experience) {
        const expJson = await loadJson(expPath);
        experience.push(new Experience(expJson));
    }

    const skills = [];
    for (const skillPath of config.skills) {
        const skillJson = await loadJson(skillPath);
        skills.push(new Skill(skillJson));
    }

    const personnal_achievements = [];
    for (const paPath of config.personnal_achievements) {
        const paJson = await loadJson(paPath);
        personnal_achievements.push(new PersonalAchievement(paJson));
    }

    return new CvData({
        header,
        title,
        summary,
        education,
        experience,
        skills,
        personnal_achievements
    });
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: node dataLoader.js <config.json> [-v]');
        process.exit(1);
    }

    const configPath = args[0];
    const verbose = args.includes('-v');

    const cv = await loadCvData(configPath);
    console.log(cv.toString(verbose));
}

// Exécuter si script lancé directement
if (require.main === module) {
    main();
}


module.exports = {
    loadCvData,
    Header,
    Title,
    Summary,
    Education,
    Experience,
    Skill,
    PersonalAchievement,
    CvData
};
