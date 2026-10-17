Which of the following is acommon use case for using Redux in a React application?
A. Managing authentication and user sessions
B. Styling and layout of React components
C. Handling form validation and input tracking
D. Implementing server-side rendering in React
Đáp án: A
Giải thích: Redux được thiết kế tối ưu nhất dé quản lý các trạng thái toàn cục (global state) dùng chung bởi rất nhiều component không có quan hệ cha-con trực tiếp, điển hình là trạng thái đăng nhập và phiên làm việc của người dùng.

Which hook is typically used alongside useSelector to modify the Redux state?
A. useState
B. useEffect
C. useDispatch
D. useContext
Đáp án: C
Giải thích: Để thay đổi trang thái trong Redux Store, ta bắt buộc phải gửi đi (dispatch) một hành động. Hook useDispatch cung cắp chính xác hàm điều phối này trong các functional component.

What is the purpose of the Redux middleware in React applications?
A. To handle asynchronous actions and side effects
B. To define the structure of the Redux store
C. To connect React components to the Redux store
D. To manage component hierarchy
Đáp án: A
Giải thích: . Redux Middleware (như Redux Thunk) là lớp trung gian đứng giữa thời điểm action được kích hoạt và lúc nó chạm tới reducer, đóng vai trò cốt lõi trong việc đánh chặn để xử lý các logic bat đồng bộ hoặc gọi API.

What is the core principle of Redux?
A. Single source of truth and unidirectional data flow.
B. Multiple sources of truth for each component.
C. State is mutable and can be directly modified.
D. State is only updated using the useState hook.
Đáp án: A
Giải thích: Triết lý nền tảng của Redux dựa trên ba nguyên lý: toàn bộ trạng thái hệ thống nằm ở một kho duy nhất (Single source of truth), trạng thái mang tính chỉ đọc (immutable) và dữ liệu chuyển dịch theo luồng một chiều nghiêm ngặt.

What is the advantage of using Axios over fetch?
A. Axios has better support for handling requests and responses.
B. Axios requires less boilerplate code.
C. Axios is faster than fetch for all types of HTTP requests.
D. Axios does not support promises.
Đáp án: B
Giải thích: Axios tự động hóa việc chuyển đổi dữ liệu sang định dạng JSON (automatic JSON transformation) và cung cấp cơ chế bắt lỗi HTTP trực quan, giúp giảm thiểu tối đa lượng mã nguồn lặp đi lặp lại (boilerplate) so với Fetch API gốc.

What is the main purpose of the await keyword within an async function?
A. To return a new Promise object.
B. To immediately execute the next line of code without waiting.
C. To pause the execution of the async function until the Promise it's waiting for is resolved or rejected.
D. To define a synchronous block of code
Đáp án: C
Giải thích: . Từ khóa await tạm dừng luồng chạy của hàm async tại dòng đó để đợi Promise xử lý xong, giúp lập trình viên viết và đọc các tác vụ bat đồng bộ theo phong cách tuần tự trực quan của mã đồng bộ.

Why would a React developer choose to use "Axios"?
A. To render React components faster
B. To manage component state globally
C. To make HTTP requests to APIs
D. To build reusable hooks
Đáp án: C
Giải thích: Axios là một thư viện HTTP client phổ biến dựa trên Promise, được cài đặt vào dự án chuyên dụng cho việc thực hiện các yêu cầu giao. tiếp dữ liệu (HTTP requests) tới máy chủ mạng API.

Which method is most commonly used in a React app to fetch data from a server?
A. WebSockets
B. useState()
C. fetch or axios inside useEffect()
D. console.logO inside render()
Đáp án: C
Giải thích: Việc gọi API mạng từ máy chủ được phân loại là một Side Effect (tác vụ bên lề). Do đó, quy trình chuẩn mực của React là thực thi fetch hoặc axios đặt trong hook quản lý vòng đời useEffect.

Which of the following is used to pass a function from a parent component to a child component?
A. Passing a function as a prop to the child component.
B. Using useState hook in the child component.
C. Using useContext in both parent and child components.
D. Directly accessing the child component's state.
Đáp án: A
Giải thích: Do dữ liệu trong React dịch chuyển một chiều từ trên xuống, ta có thể truyền một hàm xử lý (callback function) như một thuộc tính (prop) bình thường từ cha xuống con đề cấu hình cho con kích hoạt khi cần thiết.

What happens when you use the xs prop on a Col component in React-Bootstrap?
A. The column will only have its width defined on extra-large screens.
B. The column will only have its width defined on extra-small screens, and larger sizes will ignore it
C. The column will have its width defined on extra-small screens and will apply to larger sizes if no specific breakpoint is defined.
D. The xs prop does not exist in React-Bootstrap
Đáp án: C
Giải thích: Hé thống Grid của Bootstrap vận hành theo tư duy ưu tiên thiết bị di động (Mobile-first). Mọi cấu hình độ rộng đặt ở thuộc tính màn hình siêu nhỏ (xs) sẽ tự động kế thừa lên tắt cả kích thước màn hình lớn hơn trừ khi bị một breakpoint lớn hơn ghi đè.

How can you ensure that a prop is passed as an array with at least one element?
A. By using PropTypes.array.isRequired
B. By creating a custom PropType validator
C. By using PropTypes.arrayOf()
D. By using PropTypes.objectOf()
Đáp án: B
Giải thích: Các hàm kiểm định mặc định của thư viện PropTypes chỉ kiểm tra được kiểu dữ liệu hoặc tính bắt buộc của mảng mà không kiểm tra được độ dài thực tế của phan tử bên trong mảng đó (Slength > O$). Do đó ta phải tự định nghĩa một hàm validator tùy biến (custom validator).

What is the primary purpose of a router in a web application?
A. To manage state within a component
B. To respond to a URL based on a set of route handler declarations
C. To handle server-side logic
D. To manage routing in a React application
Đáp án: B
Giải thích: Trách nhiệm cốt lõi của một hệ thống định tuyến (router) trong ứng dụng web là đồng bộ hóa thanh địa chi URL của trình duyệt, từ đó đối chiều hiển thị chính xác giao diện dựa vào danh sách cấu hình tuyến đường đã khai báo.

How do you declare a route in React Router?
A. Using <Link element="/<Home" path="*">} />
B. Using <Route element="{<Home" path="/"/>} />
C. Using <Routes element="(<Home" path="*/">)/>
D. Using <context path="></context></suspense></home>
Đáp án: B
Giải thích: Trong thư viện React Router v6, thẻ <Route> là cú pháp chuẩn mực quy định việc bắt cặp giữa thuộc tính path (đường dẫn định danh) và thuộc tính element (nhận vào một node JSX đại diện cho component sé render).

What is the difference between the HTTP response codes 401 and 403?
A. 401 the request is missing valid authentication credentials, while 403 the server refuses to authorize.
B. 401 the server encountered an internal error, while 403 means the requested resource was not found.
C. 401 the request was successful, while 403 means the request was not modified.
D. 401 and 403 are interchangeable and have the same meaning
Đáp án: A
Giải thích: Mã trạng thái 401 Unauthorized chỉ lỗi hệ thống không nhận dạng được danh tính người dùng (chưa xác thực/chưa đăng nhập). Trong khi mã 403 Forbidden phản hồi rằng hệ thống biết danh tính của bạn nhưng bạn hoàn toàn không có quyền hạn truy cập tài nguyên đó.

Which of the following is the correct way to use useSelector to access a value from the Redux store?
A. const value = useSelector((store) => store.value);
B. const value = useSelector((state) => state.value);
C. const value = useSelector((context) => contextvalue);
D. const value = useSelector((redux) => redux.value);
Đáp án: B
Giải thích: Cú pháp quy chuẩn của hook useSelector yêu cầu truyền vào một hàm chọn lựa (selector function). Hàm này nhận đối số mặc định đại diện cho toàn bộ cây trạng thái hiện hành của kho lưu trữ (state) để trích xuất dữ liệu.

What is the typical file extension for a React component?
A. html
B. .css
C. js or jsx
D. php
Đáp án: C
Giải thích: Thành phần giao diện trong React được xây dựng bằng cú pháp mở rộng phối hợp JavaScript và XML, do đó các tệp mã nguồn sẽ mang định dạng chuẩn là js hoặc chuyên biệt là jsx.

Nhiều đáp án đúng What is the purpose of React Fragment or shorthand <> </> in React? (Select all that apply)
A. Fragments allow you to group multiple elements without adding an extra node to the DOM.
B. Fragments allow you to provide CSS styling to multiple elements.
C. Fragments allow you to handle state management in React.
D. Fragments are particularly useful for avoiding unnecessary <div> elements, which can clutter your markup.
Đáp án: A
Giải thích: D. React Fragment được sinh ra nhằm mục đích gom nhóm danh sách các phần tử con đồng cấp lại mà không gây ảnh hưởng hay sinh ra một thẻ bao bọc vật lý du thừa (như <div>) trong cây cầu trúc DOM thật, giúp giữ cây markup sạch sẽ.

How can the useEffect hook be optimized for cleanup actions?
A. By passing an empty array as the second argument
B. By using a class-based component
C. By calling it after every render
D. By manually removing event listeners
Đáp án: A
Giải thích: Bằng cách truyền một mảng phụ thuộc rỗng [] làm tham số thứ hai, ta chỉ thị cho hook useEffect chỉ thực thi logic đúng một lần duy nhất sau lượt render đầu tiên, và hàm cleanup trả về từ nó cũng sẽ chỉ kích hoạt tối ưu một lần duy nhất khi com ponent bị hủy (unmount).

How would you use the useContext Hook to access a shared theme in a React component?
A. const theme = useContext(ThemeContext);
B. const (theme ) = useContext(ThemeContext);
C. const { theme } = useContext(ThemeContext.Provider);
D. const theme = useContext(ThemeContext.Provider);
Đáp án: A
Giải thích: Cú pháp chính thức của hook useContext yêu cầu lập trình viên phải truyền trực tiếp chính đối tượng ngữ cảnh được khởi tạo ban đầu (ThemeContext) vào làm đối số, tuyệt đối không truyền phan tử bao bọc định dạng .Provider.

Which of the following could cause an Effect to run too frequently?
A. Including all state variables in the dependency array.
B. Not using a dependency array.
C. Including a variable like data that changes often in the dependency array.
D. Omitting the dependency array altogether.
Đáp án: B
Giải thích: Nếu lập trình viên bỏ qua hoặc không khai báo tham sỐ mảng phụ thuộc (dependency array) cho useEffect, hàm hiệu ứng này sé bị ép buộc tái thực thi liên tục sau mọi chu ky render của component, dẫn đến việc chạy quá tần suất cần thiết.

Which of the following is NOT considered a popular front-end framework?
A. React
B. Angular
C. Django
D. Vuejs
Đáp án: C
Giải thích: Django là một framework mã nguồn mở nổi tiếng chuyên đảm nhận các logic nghiệp vụ xử lý dữ liệu ở phía máy chủ (Back-end) phát triển bằng ngôn ngữ Python, không thuộc nhóm thư viện/framework UI Front-end.

What is one major benefit of using front-end frameworks like React or Vue js?
A. They eliminate the need for HTML
B. They allow for faster development by providing pre-built components
C. They only work on mobile applications
D. They focus solely on server-side development
Đáp án: B
Giải thích: Lợi điểm lớn nhất của các giải pháp Front-end component-based hiện đại là khả năng tái sử dụng mã nguồn cao, cung cap cấu trúc phát triển đồng bộ giúp rút ngắn đáng kể tiền độ xây dựng ứng dụng phức tạp.

How can you access Chrome Dev Tools?
A. By pressing F12 or right-clicking and selecting "Inspect"
B. By installing a Chrome extension
C. By typing "chrome://devtools" in the address bar
D. By opening the Chrome menu and selecting "Dev Tools"
Đáp án: A
Giải thích: Lối tắt tiêu chuẩn trên mọi nền tảng trình duyệt lõi Chromium để mở bảng công cụ phát triển phần mềm DevTools là nhấn phím chức năng F12 hoặc thực hiện nhấp chuột phải trên màn hình rồi lựa chọn tác vụ Inspect (Kiểm tra).

How would you render a user's name dynamically inside an tag in JSX?
A. <h2> <p>{userName}</p> </h2>
B. <h2> {userName} </h2>
C. <h2> "userName" </h2>
D. <h2>{userName: "John"}</h2>
Đáp án: B
Giải thích: Trong cú pháp viết JSX, dé đưa bat kỳ một giá tri biến đồi hay một biểu thức tính toán động nào. của JavaScript hiển thị ra giao diện HTML, ta bắt buộc phải bao bọc biến đó bên trong cặp dấu ngoặc nhọn {userName}.

The purpose of JSX is to:
A. Make JavaScript code more readable by embedding HTML in JavaScript
B. Make JavaScript run faster
C. Encrypt HTML elements
D. Handle server-side logic
Đáp án: A
Giải thích: JSX (JavaScript XML) là một phần mở rộng cú pháp được thiết kế giúp trực quan hóa cau trúc giao diện người dùng bằng cách viết mã có diện mạo giống hệt HTML ngay bên trong môi trường logic JavaScript, cải thiện độ tường minh và dễ đọc của code.

What does ES6 introduce that is essential for React applications? (Select all that apply)
A. Arrow functions
B. Destructuring assignment
C. JSX syntax
D. Template Literals
Đáp án: A
Giải thích: BD. Các tính năng như hàm mũi tên (Arrow functions), phân rã đối tượng/mảng (Destructuring) và chuỗi ky tự động (Template Literals) đều thuộc đặc tả tiêu chuẩn ES6 và được ứng dụng liên tục trong React. Riêng cú pháp JSX là một công cụ riêng của hệ sinh thái React, không thuộc đặc tả ES6 gốc.

What is the main purpose of React-Bootstrap?
A. To build React components using jQuery
B. To use Bootstrap styles with inline CSS only
C. To provide Bootstrap-styled components built entirely with React
D. To convert Bootstrap HTML into Angular components
Đáp án: C
Giải thích: Thư viện react-bootstrap được phat triển nhằm mục đích tái cấu trúc toàn diện hệ thống UI của Bootstrap sang dạng các component thuần React, loại bỏ hoàn toàn sự phụ thuộc vào các đoạn mã JavaScript/jQuery truyền thống tác động trực tiếp vào DOM.

Which of the following is the first step in React's render cycle?
A. Triggering a render when state or props change.
B. Re-rendering the component.
C. Committing the changes to the DOM.
D. Calculating the minimal necessary updates for the DOM.
Đáp án: A
Giải thích: Bắt kỳ chu kỳ dựng hình (render cycle) nào của React cũng luôn được mở màn bằng một hành động kích hoạt (Triggering), xảy ra bắt cứ khi nào có sự thay đổi về mặt d ue tang đạo cu nội tai (state) hoặc đạo cụ truyền từ cha (props).

How can you pass parameters to an event handler in React? (Select all that apply)
A. Using the bind method.
B. Using arrow functions.
C. Using the addEventListener method.
D. Using the this keyword.
Đáp án: A, B, C
Giải thích: Để chuyển tiếp các đối số cụ thể vào hàm xử lý sự kiện trong JSX mà không làm hàm bị thực thi ngay khi render, lập trình viên có thể bọc lời gọi hàm bên trong một hàm mũi tên ẩn danh hoặc sử dụng phương thức nguyên bản .bind().

Cau 80/166 Đã chon 77/166 - Đã kiểm tra 77/166 - Đúng 77/77 What is the primary purpose of Next.js?
A. To enable server-side rendering and generate static websites.
B. To manage state in React applications
C. To provide a UI component library.
D. To create database schemas.
Đáp án: A
Giải thích: Next.js ra đời đóng vai trò là một production framework hoàn chỉnh kiến tạo trên lõi React nhằm cung cấp giải pháp dựng giao diện trực tiếp tại phía máy chủ (SSR) cùng khả năng biên dịch trang tĩnh (SSG) để tăng tốc độ tối đa cho ứng dụng.

What is the main advantage of Tailwind CSS compared to Bootstrap?
A. It provides more flexibility to create custom designs and components.
B. Itis easier to use and has fewer customization options.
C. It has predefined components for quick styling.
D. It offers faster page loading times.
Đáp án: A
Giải thích: Thay vì đóng gói cố định hình dáng UI theo các khuôn mẫu linh kiện định sẵn như Bootstrap, Tailwind CSS cung cấp hệ thống các utility class nguyên tử li tỉ, trao toàn quyền tự do thiết kế bố cục độc bản cho lập trình viên mà không sợ trùng lặp giao diện.

What command is used to create a new Next.js project?
A. npx create-react-app
B. npm install next
C. npx create-next-app
D. git clone nextjs
Đáp án: C
Giải thích: Trình chạy CLI chuẩn hóa được phân phối chính thức bởi đội ngũ Vercel để khởi tạo toàn diện một dự án cầu hình Nextjs khung cơ bản là công cụ npx create-next-app.

What is a core feature of Next.js that enhances SEO?
A. Real-time data fetching.
B. Client-side routing.
C. Automatic code splitting.
D. Server-side rendering.
Đáp án: D
Giải thích: Với tinh năng kết xuất phía máy chủ (Server-Side Rendering), máy chủ phản hồi về trình duyệt một file HTML chứa đầy đủ văn bản và cau trúc nội dung trang ngay lập tức, hỗ trợ tốt nhất cho các thuật toán thu thập dữ liệu (crawlers) của công cụ tìm kiếm chấm điểm SEO.

Which Bootstrap class is commonly used to create a responsive navigation bar?
A. navbar-static
B. nav-horizontal
C. navbar
D. navigation-block
Đáp án: C
Giải thích: Lớp nền tảng bắt buộc dé Bootstrap nhận diện, áp đặt kiểu dáng hiển thị thanh công cụ điều hướng thích ứng theo chiều rộng màn hình và quản lý các hành vi thu gọn (collapse) là lớp danh định .navbar.

Which class is used to create a form input with a validation state in Bootstrap 5?
A. form-control
B. input-group
C. form-check
D. form-validation
Đáp án: A
Giải thích: Lớp form-control được áp dụng trực tiếp cho các thẻ <input> để định hình kiểu dáng ô nhập liệu. Khi biểu mẫu kết hợp trạng thái kiểm thử dữ liệu (validation), lớp này sẽ tự động thay đổi viền màu (xanh/ đỏ) dựa vào các class phụ trợ như .is-valid hoặc .is-invalid.

Which Bootstrap class provides a fluid container that adapts to all breakpoints?
A. container-fluid
B. container
C. container-lg
D. container-xs
Đáp án: A
Giải thích: Sử dụng lớp .container-fluid đảm bảo rằng chiều rộng của khối bao bọc đó sẽ luôn luôn tự động kéo giãn phủ kin 100% diện tích chiều ngang khung nhìn của thiết bi (width: 100%) tại mọi điểm ngắt kích thước màn hình.

Why should you avoid using too many lazy components in your application?
A. Because it results in multiple HTTP requests, slowing down the application.
B. Because it decreases the performance by loading everything upfront.
C. Because it makes the code difficult to debug
D. Because it affects the layout and styling of components.
Đáp án: A
Giải thích: Việc chia nhỏ tệp bundle một cách thái quá thông qua React.lazy sẽ biến ứng dụng thành vô sé mảnh nhỏ riêng biệt. Khi người dùng điều hướng qua lại, trình duyệt buộc phải liên tục khởi tạo một lượng lớn các yêu cầu tải mang (HTTP requests) đơn lẻ, dễ gây nghẽn và làm chậm phản hồi UI.

How would you extract and display multiple parameters, userld and postld, ina component?
A. const { userld, postld } = useParams();
B. const userld = useParams("userld"); const postld = useParams("postid");
C. const userld = route.params.userld; const postld = route.params.postld;
D. const { userld } = useParams(); const { postld } = useParams();
Đáp án: A
Giải thích: Hook useParams() từ thư viện React Router trả về một đối tượng JavaScript duy nhất bao gồm tập hợp toàn bộ các cặp khóa/giá trị tham lộng trích xuất từ URL. Do đó, cú pháp chuẩn xác và tinh gọn nhat dé lầy dữ liệu ra là dùng kỹ thuật giải cấu trúc đối tượng (Destructuring).

How would you navigate programmatically to a route with a parameter using useNavigate in React Router?
A. navigate("/user:id");
B. navigate("/user?id=123");
C. navigate("/user/123");
D. navigate({ path: "/user/123" });
Đáp án: C
Giải thích: Khi sử dụng hàm điều hướng chủ động được trả về từ useNavigate(), lập trình viên cần truyền vào một chuỗi ký tự mô tả chính xác đường dẫn tuyệt đối cuối cùng cần nhảy đến, trong đó phần tham số đã được điền sẵn giá trị cụ thé (ví dụ: "/user/123").

In the useEffect hook, how many milliseconds would you wait using setTimeout to perform a side effect after 2 seconds?
A. 2
B. 200
C. 2000
D. 20000
Đáp án: C
Giải thích: Hàm đếm ngược thời gian setTimeout tích hợp sẵn của JavaScript sử dụng hệ thống đo lường thời gian trễ có đơn vị tính mặc định là mili-giây (milliseconds). Theo quy đổi toán học chuẩn: $2 \text{ giây = 2 \times 1000 = 2000 \text{ ms}S.

Which is the correct way to consume context in a functional component using the "useContext" hook?
A. const value = MyContext;
B. const value = useContext(MyContext);
C. const value = this.context(MyContext);
D. <MyContext.Provider useContext="{value}">
Đáp án: B
Giải thích: Phương thức quy chuẩn duy nhất trong các functional component của React để tiếp nhận dữ liệu từ một Context dùng chung là gọi thực thi hook useContext() và trực tiếp truyền đối tượng Context gốc (MyContext) vào làm tham số đầu vào.

In React Router, how do you define a nested route structure within a parent component?
A. Utilize the <Switch> component to handle nested routes
B. Implement a routing table using an array of route objects
C. Use the <Route> component with nested <Route> components
D. Direct routes using query parameters in URL path names
Đáp án: C
Giải thích: Kể từ phiên bản React Router v6, giải pháp chính thống để xây dựng cấu trúc định tuyến lồng nhau (Nested Routing) nhằm phục vụ hiển thị bồ cục lặp lại (Layout Component) là viết các thẻ <Route> con lồng trực tiếp vào bên trong phạm vi thẻ đóng/mở của thẻ <Route> cha tương ứng.

const server = jsonServer.create(); const router = jsonServer.router('data.json'); const port = 3000; server.use(router); server.listen(port, () => console.log(`JSON server is running on port ${port}`)); What is the above code used for?
A. Create a dynamic server to serve JSON data.
B. Create a dynamic web application using JSON data.
C. Create a JSON file based on data from the server.
D. Configure the development environment for the project using JSON.
Đáp án: A
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án A.)

How do you dispatch an action when a button is clicked?
A. const handleClick = () => { dispatch({ type: 'BUTTON_CLICKED' }); }; <button onClick={handleClick}>Click me</button>;
B. const handleClick = () => { dispatch({ type: 'BUTTON_CLICKED' }); }; <button onClick={() => handleClick()}>Click me</button>;
C. const handleClick = () => { dispatch({ type: 'BUTTON_CLICKED' }); }; <button onClick={handleClick()}>Click me</button>;
D. const handleClick = () => { dispatch({ action: 'BUTTON_CLICKED' }); }; <button onClick={handleClick}>Click me</button>;
Đáp án: A
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án A.)

Why might this code produce unexpected results? function Counter() { const [count, setCount] = useState(0); const handleClick = () => { setCount(count + 1); setCount(count + 1); }; return <button onClick={handleClick}>{count}</button>; }
A. Because setCount is called twice, it resets state
B. Because setCount merges the updates automatically
C. Both setCount(count + 1) calls use the same snapshot of count
D. It's invalid to call setCount twice
Đáp án: C
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án C.)

Find the bug in the following React code: const [items, setItems] = useState([]); const addItem = () => { items.push('new'); };
A. useState should be useReducer
B. use setItems([...items, 'new'])
C. push is not a valid method
D. setItems must take a string
Đáp án: B
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án B.)

JSX in React stands for:
A. JavaScript XML.
B. Java Syntax Extension
C. JavaScript Executive Extension
D. JSON Extension
Đáp án: A
Giải thích: Về mặt thuật ngữ, JSX là viết tắt của JavaScript XML. Đây là một phần mở rộng cú pháp mở cho phép lập trình viên viết các cầu trúc giống hệt mã HTML trực tiếp trong tệp mã nguồn JavaScript.

Understand the role of the render method in JSX. Which of the following best explains its use?
A. The render method is used to compile JSX into JavaScript.
B. The render method is used to convert JSX into HTML and render it to the DOM.
C. The render method is used to manage state in React components.
D. The render method is used to handle routing in React applications.
Đáp án: B
Giải thích: Nhiệm vụ cốt lõi của phương thức render() (trong Class Component) là chuyển đổi câu trúc khai báo cây Virtual DOM dưới dạng JSX thành mã HTML vật lý dé chèn và hién thị trực tiếp lên cây cầu trúc DOM của trình duyệt.

To specify that a property must be provided and must have a specific type in PropTypes, what is appended to the type validator?
A. optional
B. default
C. .isRequired
D. .mustExist
Đáp án: C
Giải thích: Thuộc tính bổ trợ .isRequired được gắn liền phía sau các trình kiểm định kiểu dữ liệu của thư viện PropTypes dé ràng buộc rằng prop đó bắt buộc phải được thành phan cha truyền xuống khi khởi tạo.

Which pair of Git commands is used to create a new branch and then switch to it?
A. git new branch-name; git change branch-name
B. git branch branch-name; git checkout branch-name
C. git make branch-name; git switch branch-name
D. git create branch-name; git select branch-nam
Đáp án: B
Giải thích: Trong hệ thống quản lý mã nguồn Git, câu lệnh git branch <tên_nhánh> đảm nhận việc khởi tao một nhánh rẽ mới, và lệnh git checkout <tên_nhánh> dùng để di chuyển vùng làm việc hiện hành sang nhánh đó.

