import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

// Parse date strings like "Jul 14, 2024" or "Dec 17th, 2023"
function parseDate(dateStr) {
	// Remove ordinal suffixes (st, nd, rd, th)
	const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, "$1");
	return new Date(cleaned);
}

export async function GET(context) {
	const posts = await getCollection("post");

	// Sort posts by date (newest first)
	const sortedPosts = posts.sort((a, b) => {
		const dateA = parseDate(a.data.dateFormatted);
		const dateB = parseDate(b.data.dateFormatted);
		return dateB - dateA;
	});

	return rss({
		title: "Gary Jarrel",
		description:
			"PropTech entrepreneur and Software Engineer from Melbourne, Australia.",
		site: context.site,
		items: sortedPosts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: parseDate(post.data.dateFormatted),
			link: `/post/${post.slug}/`,
		})),
		customData: "<language>en-au</language>",
	});
}
