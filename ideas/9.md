# JS library for citing sources
Make citing sources easy/beautiful and make viewing the source material even easier.

## Problem being solved
Citing sources should be the foundation of all material posted on the Internet and seeing an article without a recognized style of cited sources should raise eyebrows about the credibility of that article. Perhaps the reason why most articles don't cite sources is because it's tedious.

## Brainstorming
JS library used to mark items to cite. Likely going to have a tie into HTML to prevent having to write JS and HTML for the article.

```html
<script src="https://cite.js"></script>
<p>This uses <cite info="line5@cite.js">cite.js</cite> to cite this article.</p>
<p>As cite.js says, <cite info="@cite.js">we can even do direct quotes!</cite></p>
```

The client-side script then generates HTML for the cited material and gets a link from the cite.js site to point to a parsed version of the site that people can view. The view on the cite.js site is the original site analyzed but the link to the original site (wayback machine?) for true information. In this sense, cite.js would become a sort of trusted source in the sense that it itself keeps history of sites cited in case there's edits allowing for mechanisms like "retrieved on" like Wikipedia.
