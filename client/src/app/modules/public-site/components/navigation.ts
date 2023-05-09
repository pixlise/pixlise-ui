export class NavigationItem
{
    constructor(public label: string, public link: string)
    {
    } 
}

export class Navigation
{
    public categories = ["Features", "Get Started", "About Us"];
    private _categoryItems = new Map<string, NavigationItem[]>([
        [this.categories[0], [
            new NavigationItem("Workflow", "/public/workflow"),
            new NavigationItem("Quantification", "/public/quantification"),
            new NavigationItem("Investigation", "/public/investigation")
        ]],
        [this.categories[1], [
            new NavigationItem("PIXLISE Options", "/public/get-started#top"),
            new NavigationItem("Get PIXLISE", "/public/get-started#get"),
            new NavigationItem("Links and Docs", "/public/get-started#links"),
        ]],
        [this.categories[2], [
            new NavigationItem("PIXL + MARS 2020", "/public/about-us#mars2020"),
            new NavigationItem("PIXLISE", "/public/about-us#pixlise"),
            new NavigationItem("Impact", "/public/about-us#impact"),
            new NavigationItem("Discussion", "/public/about-us#discussion"),
        ]]
    ]);

    public getItems(category: string): NavigationItem[]
    {
        return this._categoryItems.get(category);
    }

    public getCategoryByLink(link: string): string
    {
        for(let [cat, items] of this._categoryItems)
        {
            for(let nav of items)
            {
                if(nav.link.startsWith(link))
                {
                    return cat;
                }
            }
        }
        return "";
    }
}
