//map code 
const Listing = require("../models/listing");

async function getCoordinates(location, country) {
    const query = `${location}, ${country}`;

    const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "WanderLust-Student-Project"
        }
    });

    if (!response.ok) {
        throw new Error("Unable to get location coordinates");
    }

    const data = await response.json();

    if (data.length === 0) {
        return null;
    }

    return {
        lat: Number(data[0].lat),
        lon: Number(data[0].lon)
    };
}

//stop here  

module.exports.index = async (req, res) => {
    const { category } = req.query;

    console.log("Selected Category:", category);

    let filter = {};

    if (category) {
        filter.category = category;
    }

    const allListings = await Listing.find(filter);

    console.log("Listings Found:", allListings.length);

    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};


module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({
        path: "reviews", populate: {
            path: "author",
        },
    }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    // Get coordinates from location + country
    const coordinates = await getCoordinates(
        newListing.location,
        newListing.country
    );


    if (coordinates) {


        newListing.geometry = {
            type: "Point",
            coordinates: [
                coordinates.lon,
                coordinates.lat
            ]
        };
    } else {
        console.log("Location coordinates not found");
    }

    let savedListing = await newListing.save();
    console.log(savedListing);

    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};



module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist");
        return res.redirect("/listings");
    }
    let orginalImageUrl = listing.image.url;
    orginalImageUrl = orginalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, orginalImageUrl });
}

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    let listing = await Listing.findByIdAndUpdate(
        id,
        { ...req.body.listing },
        { new: true, runValidators: true }
    );

    // Get coordinates for edited location
    const coordinates = await getCoordinates(
        listing.location,
        listing.country
    );

    console.log("Updated Location:", listing.location);
    console.log("Updated Country:", listing.country);

    if (coordinates) {
        console.log("Updated Latitude:", coordinates.lat);
        console.log("Updated Longitude:", coordinates.lon);

        listing.geometry = {
            type: "Point",
            coordinates: [
                coordinates.lon,
                coordinates.lat
            ]
        };
    } else {
        console.log("Location coordinates not found");
    }

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;

        listing.image = { url, filename };
    }

    let savedListing = await listing.save();
    console.log(savedListing);

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id)
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}