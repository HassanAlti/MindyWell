// THIS FILE IS FOR EXTRACTING THE DATA FROM THE THERAPIST CSV FILE TO SAVE IN THE VECTOR DB

import fs from "fs";
import csv from "csv-parser";
import JSON5 from "json5";

const inputFilePath = "input.csv";
const outputFilePath = "output.txt";
const outputStream = fs.createWriteStream(outputFilePath);

fs.createReadStream(inputFilePath)
  .pipe(csv())
  .on("data", (row) => {
    // Replace uppercase booleans and handle "None"
    const jsonStr = row.attributes
      .replace(/: True/g, ": true")
      .replace(/: False/g, ": false")
      .replace(/: None/g, ": null");

    const primaryLocationStr = row.primaryLocation
      .replace(/: True/g, ": true")
      .replace(/: False/g, ": false")
      .replace(/: None/g, ": null");

    try {
      // Parse the modified JSON using json5
      const attributesArray = JSON5.parse(jsonStr);
      const primaryLocationObject = JSON5.parse(primaryLocationStr);

      // Extract information from the primaryLocation
      const country = primaryLocationObject.countryCode || "N/A";
      const region = primaryLocationObject.regionName || "N/A";
      const city = primaryLocationObject.cityName || "N/A";

      // Filter objects with 'category_name' equal to 'issues' and extract 'name' values
      const issueNames = attributesArray
        .filter((obj) => obj.category_name === "issues")
        .map((obj) => obj.name)
        .slice(0, 3)
        .join(", ");

      // Write the sentence to the output text file
      const sentence = `${row.title} ${row.listingName} whose location is ${country}, ${region}, ${city} is a ${row.healthRole} specialized in ${issueNames}. Their phone number is ${row.formattedPhoneNumber} \n\n`;
      outputStream.write(sentence);
    } catch (error) {
      console.error(`Error parsing JSON in row ${row.id}: ${error.message}`);
    }
  })
  .on("end", () => {
    console.log("Conversion completed.");
    outputStream.end();
  });
